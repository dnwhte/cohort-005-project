# Glossary

Use these words in UI copy, emails, code and issues. If you need a word that isn't here, add it here first.

## Refunds

### Refund Request

A learner's request to get their money back for one purchase. It carries the learner's **reason** and a **status**:

| Status   | Meaning                                    | Code                     |
| -------- | ------------------------------------------ | ------------------------ |
| Pending  | Waiting for someone on our team to decide. | `RefundStatus.Requested` |
| Approved | We agreed to refund the purchase.          | `RefundStatus.Approved`  |
| Declined | We said no. Nothing is refunded.           | `RefundStatus.Declined`  |

The `refunds` table holds Refund Requests, despite its name. "Open" in code (`getOpenRefund`) means Pending.

Learners start a Refund Request by pressing **Cancel my purchase** on the course page. "Cancel my purchase" names that action only. It is not another word for the request.

### Refund

Money we send back to the learner. A Refund exists only for an Approved Refund Request, and it is always the full [Refundable Amount](#refundable-amount). There are no partial refunds.

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

- If the learner bought at a purchasing-power price, the amount they paid.
- Otherwise, the list price of the course.

### Refund Window

14 calendar days from the purchase, counted inclusively and in whole days. A learner who buys at 23:00 still gets all of day 14.

### Ineligible

A purchase whose learner cannot start a Refund Request. Reasons:

- The Refund Window has closed.
- The learner has watched or completed too much of the course.
- The purchase is a team seat that has been claimed. The seat belongs to the team.
- The purchase already has a Pending Refund Request.

### Rules

- A purchase has at most one Pending Refund Request at a time.
- A purchase has at most one Succeeded Refund. An Approved Refund Request may have several Refunds if earlier ones Failed.
- After a Refund Request is Declined, the learner may start another one. After one is Approved, they may not.

## Words to avoid

| Avoid      | Why                                                                                                               | Say instead                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Chargeback | In payments, a chargeback is a dispute the cardholder opens with their bank. We don't start it or approve it. The app doesn't handle chargebacks yet. Use the word only for that. | Refund Request              |
| Reversal   | Means undoing a transaction before it settles. That isn't what happens here.                                      | Refund Request / Refund     |
| Raised     | Vague.                                                                                                            | Requested                   |
