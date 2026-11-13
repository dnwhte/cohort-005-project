import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { RefundStatus, UserRole } from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  decideRefundRequest,
  getPendingRefundRequests,
  getRefundEligibility,
} from "./refunds.server";

let base: ReturnType<typeof seedBaseData>;
let admin: typeof schema.users.$inferSelect;

function buy(userId: number) {
  const purchase = testDb
    .insert(schema.purchases)
    .values({ userId, courseId: base.course.id, amountPaid: 5000 })
    .returning()
    .get();
  testDb
    .insert(schema.enrollments)
    .values({ userId, courseId: base.course.id })
    .run();
  return purchase;
}

function requestRefund(purchaseId: number) {
  return testDb
    .insert(schema.refunds)
    .values({ purchaseId, reason: "Not for me, sorry.", amount: 5000 })
    .returning()
    .get();
}

const enrollmentOf = (userId: number) =>
  testDb
    .select()
    .from(schema.enrollments)
    .where(eq(schema.enrollments.userId, userId))
    .get();

beforeEach(() => {
  testDb = createTestDb();
  base = seedBaseData(testDb);
  admin = testDb
    .insert(schema.users)
    .values({ name: "Pat", email: "pat@example.com", role: UserRole.Admin })
    .returning()
    .get();
  const mod = testDb
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "M1", position: 1 })
    .returning()
    .get();
  for (let i = 1; i <= 2; i++) {
    testDb
      .insert(schema.lessons)
      .values({ moduleId: mod.id, title: `L${i}`, position: i })
      .run();
  }
});

describe("decideRefundRequest", () => {
  it("Approve ends the Enrollment, keeps progress, and records who decided", () => {
    const purchase = buy(base.user.id);
    const lesson = testDb.select().from(schema.lessons).get()!;
    testDb
      .insert(schema.lessonProgress)
      .values({
        userId: base.user.id,
        lessonId: lesson.id,
        status: schema.LessonProgressStatus.Completed,
      })
      .run();
    const refund = requestRefund(purchase.id);

    const result = decideRefundRequest(refund.id, RefundStatus.Approved, admin.id);

    expect(result?.refund.status).toBe(RefundStatus.Approved);
    expect(result?.refund.resolvedByUserId).toBe(admin.id);
    expect(result?.refund.resolvedAt).toBeTruthy();
    expect(enrollmentOf(base.user.id)).toBeUndefined();
    expect(testDb.select().from(schema.lessonProgress).all()).toHaveLength(1);
  });

  it("Decline keeps the Enrollment", () => {
    const refund = requestRefund(buy(base.user.id).id);
    decideRefundRequest(refund.id, RefundStatus.Declined, admin.id);
    expect(enrollmentOf(base.user.id)).toBeDefined();
  });

  it("is final: a second decision changes nothing", () => {
    const refund = requestRefund(buy(base.user.id).id);
    decideRefundRequest(refund.id, RefundStatus.Declined, admin.id);

    expect(decideRefundRequest(refund.id, RefundStatus.Approved, admin.id)).toBeNull();
    expect(enrollmentOf(base.user.id)).toBeDefined();
  });
});

describe("getPendingRefundRequests", () => {
  it("lists only Pending requests with progress and limit warnings", () => {
    const pending = requestRefund(buy(base.user.id).id);
    const lesson = testDb.select().from(schema.lessons).get()!;
    testDb
      .insert(schema.lessonProgress)
      .values({
        userId: base.user.id,
        lessonId: lesson.id,
        status: schema.LessonProgressStatus.Completed,
      })
      .run();
    const declined = requestRefund(buy(base.instructor.id).id);
    decideRefundRequest(declined.id, RefundStatus.Declined, admin.id);

    const rows = getPendingRefundRequests();

    expect(rows.map((r) => r.id)).toEqual([pending.id]);
    expect(rows[0]).toMatchObject({ lessonCount: 2, completedLessonCount: 1 });
    expect(rows[0].warnings).toEqual(["Completed half the course or more"]);
  });
});

describe("getRefundEligibility", () => {
  it("targets the purchase that enrolled the Student, not a later Team Purchase", () => {
    const own = buy(base.user.id);
    const team = testDb.insert(schema.teams).values({}).returning().get();
    const teamPurchase = testDb
      .insert(schema.purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 15000,
        createdAt: new Date(Date.now() + 1000).toISOString(),
      })
      .returning()
      .get();
    testDb
      .insert(schema.coupons)
      .values({
        teamId: team.id,
        courseId: base.course.id,
        code: "seat-1",
        purchaseId: teamPurchase.id,
      })
      .run();

    const eligibility = getRefundEligibility(base.user.id, base.course);

    expect(eligibility.eligible && eligibility.purchase.id).toBe(own.id);
  });

  it("reports a Pending request so the course page can show it", () => {
    const refund = requestRefund(buy(base.user.id).id);
    const eligibility = getRefundEligibility(base.user.id, base.course);
    expect(!eligibility.eligible && "pendingRequest" in eligibility).toBe(true);
    expect(
      !eligibility.eligible &&
        "pendingRequest" in eligibility &&
        eligibility.pendingRequest?.requestedAt
    ).toBe(refund.requestedAt);
  });

  it("offers a Seat Holder nothing: they have no purchase", () => {
    testDb
      .insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    expect(getRefundEligibility(base.user.id, base.course).eligible).toBe(false);
  });
});
