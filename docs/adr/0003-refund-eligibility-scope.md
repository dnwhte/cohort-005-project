# 3. What the refund limits measure, and which purchase "Request a refund" means

- Status: Accepted
- Date: 2026-11-13

## Context

`getRefundEligibility` in `app/lib/refunds.server.ts` picks the user's **latest** purchase of the course. A user can hold an individual purchase and a Team Purchase of the same course, because buying Seats is allowed while enrolled. In that case the course-page refund button (then called **Cancel my purchase**), which is offered because of the individual Enrollment, would point at the Team Purchase, and approving it would delete the Learner's own Enrollment.

Seat Holders are enrolled but have no purchase. Scenario testing also raised two other questions: whether the Refund Window limits deciding as well as asking, and whether progress from an earlier, refunded purchase counts.

## Decision

- **Request a refund** on the course page always means the purchase that created the Learner's Enrollment, never a Team Purchase. Eligibility looks only at purchases without Seats.
- A **Seat Holder** is never offered Request a refund. The Seat belongs to the team, and they take it up with their Team Admin.
- The **Refund Window** limits only *starting* a Refund Request. A Platform Admin may decide after it closes.
- The completed and watched limits count **all** the Learner's progress on the course, whichever purchase it happened under.
- Until Team Purchase refunds ship (ADR 4), a Team Purchase is Ineligible with an explicit reason.

## Consequences

- Approving can only ever end the Enrollment that the refunded purchase paid for.
- A slow Platform Admin doesn't cost the Buyer their refund.
- Seat Holders have nothing to do in the app if they're unhappy.

## Alternatives rejected

- **Keep "latest purchase".** It refunds and revokes the wrong thing when a user has two purchases.
- **Window limits the decision too.** It penalises the Buyer for our delay.
- **Count progress per purchase.** It allows buy, refund, buy again loops.
