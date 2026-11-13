import { useEffect } from "react";
import { data, isRouteErrorResponse, Link, useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { AlertTriangle, ReceiptText } from "lucide-react";
import type { Route } from "./+types/admin.refunds";
import { db } from "~/db";
import { courses, users, RefundStatus, UserRole } from "~/db/schema";
import { requireUserId } from "~/lib/access.server";
import { parseFormData } from "~/lib/validation";
import { formatDuration, formatPrice } from "~/lib/utils";
import {
  decideRefundRequest,
  getPendingRefundRequests,
} from "~/lib/refunds.server";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

// Terms follow GLOSSARY.md. Decisions follow docs/adr/0001 and 0002.

const decisionSchema = z.object({
  refundId: z.coerce.number().int(),
  decision: z.enum([RefundStatus.Approved, RefundStatus.Declined]),
});

async function requirePlatformAdmin(request: Request) {
  const userId = await requireUserId(request);
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (user?.role !== UserRole.Admin) {
    throw data("Only Platform Admins can decide refund requests.", {
      status: 403,
    });
  }
  return userId;
}

/** There is no mail transport yet, so the built message goes to the server log. */
function buildDecisionEmail(input: {
  buyerName: string;
  buyerEmail: string;
  courseTitle: string;
  amount: number;
  decision: RefundStatus.Approved | RefundStatus.Declined;
}) {
  const approved = input.decision === RefundStatus.Approved;
  return {
    to: input.buyerEmail,
    subject: `Refund ${approved ? "approved" : "declined"} — ${input.courseTitle}`,
    body: [
      `Hi ${input.buyerName},`,
      "",
      approved
        ? `We have approved your refund request for "${input.courseTitle}". We will refund ${formatPrice(input.amount)}. You no longer have access to ${input.courseTitle}.`
        : `We have declined your refund request for "${input.courseTitle}". Nothing will be refunded, and you still have access to the course.`,
      "",
      "— The Cadence team",
    ].join("\n"),
  };
}

export function meta() {
  return [{ title: "Refund requests — Cadence" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requirePlatformAdmin(request);
  return { requests: getPendingRefundRequests() };
}

export async function action({ request }: Route.ActionArgs) {
  const platformAdminId = await requirePlatformAdmin(request);
  const parsed = parseFormData(await request.formData(), decisionSchema);
  if (!parsed.success) {
    throw data("Invalid decision.", { status: 400 });
  }

  const { refundId, decision } = parsed.data;
  const result = decideRefundRequest(refundId, decision, platformAdminId);
  if (!result) {
    return data(
      { error: "This refund request has already been decided." },
      { status: 409 }
    );
  }

  const buyer = db
    .select()
    .from(users)
    .where(eq(users.id, result.purchase.userId))
    .get()!;
  const course = db
    .select()
    .from(courses)
    .where(eq(courses.id, result.purchase.courseId))
    .get()!;
  const email = buildDecisionEmail({
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    courseTitle: course.title,
    amount: result.refund.amount,
    decision,
  });
  console.log(`[email] to=${email.to} subject=${email.subject}\n${email.body}`);

  return { decided: decision };
}

function DecisionButtons({ refundId }: { refundId: number }) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if ("error" in fetcher.data) toast.error(fetcher.data.error);
    else toast.success(`Refund request ${fetcher.data.decided}.`);
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post" className="flex gap-2">
      <input type="hidden" name="refundId" value={refundId} />
      <Button
        type="submit"
        name="decision"
        value={RefundStatus.Approved}
        disabled={busy}
      >
        Approve
      </Button>
      <Button
        type="submit"
        name="decision"
        value={RefundStatus.Declined}
        variant="outline"
        disabled={busy}
      >
        Decline
      </Button>
    </fetcher.Form>
  );
}

export default function AdminRefunds({ loaderData }: Route.ComponentProps) {
  const { requests } = loaderData;

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <ReceiptText className="size-7" />
          Refund requests
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pending requests, oldest first. Approving ends the student's access
          to the course. Decisions are final.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">No pending refund requests.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {r.buyerName}{" "}
                        <span className="font-normal text-muted-foreground">
                          {r.buyerEmail}
                        </span>
                      </p>
                      <p className="text-sm">
                        <Link to={`/courses/${r.courseSlug}`} className="underline">
                          {r.courseTitle}
                        </Link>{" "}
                        · {formatPrice(r.amount)} · bought{" "}
                        {new Date(r.purchasedAt).toLocaleDateString()} ·
                        requested {new Date(r.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <DecisionButtons refundId={r.id} />
                  </div>

                  <blockquote className="border-l-2 pl-3 text-sm italic">
                    {r.reason}
                  </blockquote>

                  <p className="text-sm text-muted-foreground">
                    Completed {r.completedLessonCount} of {r.lessonCount} lessons
                    {r.lessonCount > 0 &&
                      ` (${Math.round((r.completedLessonCount / r.lessonCount) * 100)}%)`}
                    · watched {formatDuration(Math.floor(r.secondsWatched / 60), true, false, false)}
                  </p>

                  {r.warnings.length > 0 && (
                    <p className="flex items-center gap-1.5 text-sm text-amber-600">
                      <AlertTriangle className="size-4" />
                      Over the refund limits: {r.warnings.join(", ")}. You can
                      still approve.
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error)
    ? typeof error.data === "string"
      ? error.data
      : error.statusText
    : "An unexpected error occurred while loading refund requests.";

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <p className="mb-6 text-muted-foreground">{message}</p>
        <Link to="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
