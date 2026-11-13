import { and, asc, eq, inArray, isNotNull, notExists, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  coupons,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  modules,
  purchases,
  refunds,
  users,
  videoWatchEvents,
  LessonProgressStatus,
  RefundStatus,
} from "~/db/schema";
import { getDiscountForCountry } from "~/lib/ppp";

// Terms follow GLOSSARY.md: Refund Request, Refund Window,
// Refundable Amount, Ineligible.

export const REFUND_WINDOW_DAYS = 14;
export const REFUND_WATCH_LIMIT_SECONDS = 2 * 60 * 60;
export const REFUND_COMPLETION_LIMIT = 0.5;

export type IneligibleReason = { message: string; status: 403 | 409 };

export type RefundFacts = {
  purchasedAt: Date;
  today: Date;
  latestRequestStatus: RefundStatus | null;
  hasClaimedSeat: boolean;
  lessonCount: number;
  completedLessonCount: number;
  secondsWatched: number;
};

// Compare whole calendar days, not hours: a purchase at 23:00 still gets all
// of its fourteenth day.
export function calendarDay(when: Date): string {
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${when.getFullYear()}-${month}-${day}`;
}

export function lastDayOfRefundWindow(purchasedAt: Date): string {
  const deadline = new Date(purchasedAt);
  deadline.setDate(deadline.getDate() + REFUND_WINDOW_DAYS);
  return calendarDay(deadline);
}

/** Why a learner cannot start a Refund Request, or null if they can. */
export function getIneligibleReason(f: RefundFacts): IneligibleReason | null {
  if (f.latestRequestStatus === RefundStatus.Requested) {
    return {
      message: "You already have a pending refund request on this purchase.",
      status: 409,
    };
  }
  // At most one Refund per purchase: only a Decline allows another request.
  if (f.latestRequestStatus === RefundStatus.Approved) {
    return { message: "This purchase has already been refunded.", status: 409 };
  }
  // A claimed seat from a team licence belongs to the team.
  if (f.hasClaimedSeat) {
    return { message: "A claimed team seat cannot be refunded.", status: 403 };
  }
  const today = calendarDay(f.today);
  if (
    today < calendarDay(f.purchasedAt) ||
    today > lastDayOfRefundWindow(f.purchasedAt)
  ) {
    return {
      message: `The ${REFUND_WINDOW_DAYS}-day refund window has closed.`,
      status: 403,
    };
  }
  if (
    f.lessonCount > 0 &&
    f.completedLessonCount / f.lessonCount >= REFUND_COMPLETION_LIMIT
  ) {
    return {
      message: "You have completed too much of this course to get a refund.",
      status: 403,
    };
  }
  if (f.secondsWatched >= REFUND_WATCH_LIMIT_SECONDS) {
    return {
      message: "You have watched too much of this course to get a refund.",
      status: 403,
    };
  }
  return null;
}

/** A purchase made at a purchasing-power price is refunded at that price. */
export function getRefundableAmount(
  purchase: { country: string | null; amountPaid: number },
  coursePrice: number
): number {
  return getDiscountForCountry(purchase.country) > 0
    ? purchase.amountPaid
    : coursePrice;
}

function getLessonIds(courseId: number): number[] {
  return db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((row) => row.id);
}

function getSecondsWatched(userId: number, lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;
  return db
    .select({ furthest: sql<number>`max(${videoWatchEvents.positionSeconds})` })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        inArray(videoWatchEvents.lessonId, lessonIds)
      )
    )
    .groupBy(videoWatchEvents.lessonId)
    .all()
    .reduce((total, row) => total + row.furthest, 0);
}

function getCompletedLessonCount(userId: number, lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .get();
  return row?.count ?? 0;
}

/**
 * Whether the Learner can start a Refund Request on the purchase that gave
 * them their Enrollment: their latest purchase of this course that is not a
 * Team Purchase (ADR 0003). The course page and the refund action both use
 * this, so the offer is shown exactly when the request would be accepted.
 */
export function getRefundEligibility(
  userId: number,
  course: { id: number; price: number }
) {
  const purchase = db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, userId),
        eq(purchases.courseId, course.id),
        notExists(
          db
            .select({ id: coupons.id })
            .from(coupons)
            .where(eq(coupons.purchaseId, purchases.id))
        )
      )
    )
    .orderBy(sql`${purchases.createdAt} desc`)
    .get();

  if (!purchase) {
    return {
      eligible: false as const,
      reason: { message: "You have not bought this course.", status: 403 },
    };
  }

  const latestRequest = db
    .select({
      status: refunds.status,
      amount: refunds.amount,
      requestedAt: refunds.requestedAt,
    })
    .from(refunds)
    .where(eq(refunds.purchaseId, purchase.id))
    .orderBy(sql`${refunds.id} desc`)
    .get();

  const hasClaimedSeat = !!db
    .select({ id: coupons.id })
    .from(coupons)
    .where(
      and(eq(coupons.purchaseId, purchase.id), isNotNull(coupons.redeemedAt))
    )
    .get();

  const lessonIds = getLessonIds(course.id);
  const purchasedAt = new Date(purchase.createdAt);

  const reason = getIneligibleReason({
    purchasedAt,
    today: new Date(),
    latestRequestStatus: latestRequest?.status ?? null,
    hasClaimedSeat,
    lessonCount: lessonIds.length,
    completedLessonCount: getCompletedLessonCount(userId, lessonIds),
    secondsWatched: getSecondsWatched(userId, lessonIds),
  });

  if (reason) {
    const pendingRequest =
      latestRequest?.status === RefundStatus.Requested ? latestRequest : null;
    return { eligible: false as const, reason, pendingRequest };
  }

  return {
    eligible: true as const,
    purchase,
    amount: getRefundableAmount(purchase, course.price),
    lastDayInWindow: lastDayOfRefundWindow(purchasedAt),
  };
}

// ─── Platform Admin decisions (ADR 0001, 0002) ───

/** Has the Learner passed a refund limit? Shown as a warning, never a block. */
export function getLimitWarnings(f: {
  lessonCount: number;
  completedLessonCount: number;
  secondsWatched: number;
}): string[] {
  const warnings: string[] = [];
  if (
    f.lessonCount > 0 &&
    f.completedLessonCount / f.lessonCount >= REFUND_COMPLETION_LIMIT
  ) {
    warnings.push("Completed half the course or more");
  }
  if (f.secondsWatched >= REFUND_WATCH_LIMIT_SECONDS) {
    warnings.push("Watched two hours or more");
  }
  return warnings;
}

/** Every Pending Refund Request, oldest first, with the Buyer's progress now. */
export function getPendingRefundRequests() {
  const rows = db
    .select({
      id: refunds.id,
      reason: refunds.reason,
      amount: refunds.amount,
      requestedAt: refunds.requestedAt,
      purchasedAt: purchases.createdAt,
      buyerId: users.id,
      buyerName: users.name,
      buyerEmail: users.email,
      courseId: courses.id,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(refunds)
    .innerJoin(purchases, eq(refunds.purchaseId, purchases.id))
    .innerJoin(users, eq(purchases.userId, users.id))
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .where(eq(refunds.status, RefundStatus.Requested))
    .orderBy(asc(refunds.requestedAt), asc(refunds.id))
    .all();

  // ponytail: a few queries per row; fine for a hand-reviewed queue, batch if it grows.
  return rows.map((row) => {
    const lessonIds = getLessonIds(row.courseId);
    const progress = {
      lessonCount: lessonIds.length,
      completedLessonCount: getCompletedLessonCount(row.buyerId, lessonIds),
      secondsWatched: getSecondsWatched(row.buyerId, lessonIds),
    };
    return { ...row, ...progress, warnings: getLimitWarnings(progress) };
  });
}

export type RefundDecision = RefundStatus.Approved | RefundStatus.Declined;

/**
 * Approve or Decline a Pending Refund Request. Decisions are final: returns
 * null if the request was already decided (or doesn't exist). Approving ends
 * the Buyer's Enrollment; their progress is kept.
 */
export function decideRefundRequest(
  refundId: number,
  decision: RefundDecision,
  platformAdminId: number
) {
  return db.transaction((tx) => {
    const decided = tx
      .update(refunds)
      .set({
        status: decision,
        resolvedAt: new Date().toISOString(),
        resolvedByUserId: platformAdminId,
      })
      .where(
        and(eq(refunds.id, refundId), eq(refunds.status, RefundStatus.Requested))
      )
      .returning()
      .get();

    if (!decided) return null;

    const purchase = tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, decided.purchaseId))
      .get()!;

    if (decision === RefundStatus.Approved) {
      tx.delete(enrollments)
        .where(
          and(
            eq(enrollments.userId, purchase.userId),
            eq(enrollments.courseId, purchase.courseId)
          )
        )
        .run();
    }

    return { refund: decided, purchase };
  });
}
