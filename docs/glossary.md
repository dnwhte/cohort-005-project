# Glossary

Use these words in UI copy, emails, code and issues. If you need a word that isn't here, add it here first.

## People

### Learner

Someone with an [Enrollment](#enrollment) in a course. Code calls them `UserRole.Student`.

### Buyer

The person who made a purchase. Usually also its Learner, but a [Team Purchase](#team-purchase) doesn't enroll its Buyer.

### Platform Admin

Someone on our team who runs Cadence. Platform Admins decide Refund Requests. Code: `UserRole.Admin`.

### Team Admin

Someone who manages a team's Seats. The Buyer of a Team Purchase becomes one. Team Admins never decide Refund Requests. Code: `TeamMemberRole.Admin`.

### Seat Holder

A Learner who got their Enrollment by claiming a [Seat](#seat).

## Access

### Enrollment

A Learner's access to a course's content. It ends when a Refund Request on the purchase that created it is Approved. The Learner's progress is kept.

Learner-facing copy: "You no longer have access to _Course_."

## Teams

### Team Purchase

One purchase of several Seats of a course, made by a Team Admin. It doesn't enroll its Buyer.

### Seat

One place on a course from a Team Purchase. Code: a `coupons` row. A Seat is in one of these states:

| State     | Meaning                                                              |
| --------- | -------------------------------------------------------------------- |
| Unclaimed | Nobody has redeemed its link yet.                                    |
| Held      | Its Team Purchase has a Pending Refund Request. Its link can't be claimed. |
| Claimed   | A Seat Holder redeemed it. It belongs to the team from then on.      |
| Refunded  | Its Team Purchase's Refund Request was Approved. Its link is dead for good. |

A Seat's state comes from its Team Purchase's Refund Request: every Seat in the purchase moves together. Held Seats go back to Unclaimed if the request is Declined. _Held and Refunded are not built yet._

## Refunds

### Refund Request

A Buyer's request to get their money back for one purchase. It carries the Buyer's **reason** and a **status**:

| Status   | Meaning                                    | Code                     |
| -------- | ------------------------------------------ | ------------------------ |
| Pending  | Waiting for a Platform Admin to decide.    | `RefundStatus.Requested` |
| Approved | We agreed to refund the purchase.          | `RefundStatus.Approved`  |
| Declined | We said no. Nothing is refunded.           | `RefundStatus.Declined`  |

The `refunds` table holds Refund Requests, despite its name. "Open" in code (`getOpenRefund`) means Pending.

Learners start a Refund Request by pressing **Request a refund** on the course page. There it always means the purchase that created their Enrollment, never a Team Purchase.

A Team Purchase's Buyer starts one by pressing **Request a refund** on the team page. It is all or nothing: the whole purchase, every Seat. _Not built yet._

### Refund

Money we send back to the Buyer. A Refund exists only for an Approved Refund Request, and it is always the full [Refundable Amount](#refundable-amount). There are no partial refunds.

Learner-facing copy may shorten "Refund Request" to "refund" when a status sits next to it (for example "Refund · Pending").

A Refund has its own **status**. It tracks the payment processor's progress, not our decision. _Not built yet: this lands with the payment processor._

| Status     | Meaning                                       | Learner sees                                     |
| ---------- | --------------------------------------------- | ------------------------------------------------ |
| Processing | Sent to the processor and not settled yet.    | Refund on its way                                |
| Succeeded  | The processor confirmed the money has left.   | Refunded                                         |
| Failed     | The processor couldn't pay out. This is final. | We couldn't send your refund. We're on it.      |

To retry a Failed Refund, create a new Refund for the same Approved Refund Request. Do not add payout states such as "Issued" to the Refund Request status.

### Refundable Amount

What a Refund pays back:

- If the Buyer bought at a purchasing-power price, the amount they paid.
- Otherwise, the list price of the course.
- For a Team Purchase: the amount paid, for all its Seats.

It is fixed when the Refund Request is made.

### Refund Window

14 calendar days from the purchase, counted inclusively and in whole days. A Buyer who buys at 23:00 still gets all of day 14.

The Refund Window limits only _starting_ a Refund Request. A Platform Admin may decide one after the window has closed.

### Ineligible

A purchase whose Buyer cannot start a Refund Request. Reasons:

- The Refund Window has closed.
- The Learner has watched or completed too much of the course. This counts all their progress on the course, including progress from earlier purchases. It doesn't apply to Team Purchases.
- It's a Team Purchase. _Until Team Purchase refunds are built._
- It's a Team Purchase with a Claimed Seat, even one the Buyer claimed. The Seat belongs to the team.
- The purchase already has a Pending Refund Request.

A Seat Holder has no purchase, so they can never start a Refund Request. The Seat belongs to the team.

### Rules

- A decision is final. Once a Refund Request is Approved or Declined, no one can change it.
- A purchase has at most one Pending Refund Request at a time.
- A purchase has at most one Succeeded Refund. An Approved Refund Request may have several Refunds if earlier ones Failed.
- After a Refund Request is Declined, the Buyer may start another one. After one is Approved, they may not.
- Approving a Refund Request on an individual purchase ends its Enrollment. Approving one on a Team Purchase ends no Enrollment.

## Words to avoid

| Avoid      | Why                                                                                                               | Say instead                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Admin      | Ambiguous: it could mean either kind.                                                                              | Platform Admin / Team Admin |
| Student    | The code's name (`UserRole.Student`). Don't use it in copy.                                                        | Learner                     |
| Coupon     | The table name (`coupons`) only.                                                                                   | Seat                        |
| Cancel     | Sounds instant. Nothing ends until a Platform Admin Approves the Refund Request.                                   | Request a refund            |
| Chargeback | In payments, a chargeback is a dispute the cardholder opens with their bank. We don't start it or approve it. The app doesn't handle chargebacks yet. Use the word only for that. | Refund Request              |
| Reversal   | Means undoing a transaction before it settles. That isn't what happens here.                                      | Refund Request / Refund     |
| Raised     | Vague.                                                                                                            | Requested                   |
