# 5. A Refund's payout status is separate from the Refund Request's decision

- Status: Accepted. Not built yet: this lands with the payment processor.
- Date: 2026-11-13

## Context

A Refund Request records our decision: Pending, Approved or Declined. Sending the money is a separate step that the payment processor carries out, and it can fail. We need somewhere to track that step without blurring it into the decision.

## Decision

- A **Refund** exists only for an Approved Refund Request and is always the full Refundable Amount. There are no partial refunds.
- A Refund has its own status, which follows the processor's progress:

  | Status     | Meaning                                         | Student sees                               |
  | ---------- | ----------------------------------------------- | ------------------------------------------ |
  | Processing | Sent to the processor and not settled yet.      | Refund on its way                          |
  | Succeeded  | The processor confirmed the money has left.     | Refunded                                   |
  | Failed     | The processor couldn't pay out. This is final.  | We couldn't send your refund. We're on it. |

- To retry a Failed Refund, create a new Refund for the same Approved Refund Request.
- A purchase has at most one Succeeded Refund. An Approved Refund Request may have several Refunds if earlier ones Failed.

## Consequences

- The decision stays final (ADR 1) even when a payout fails.
- A Failed Refund leaves the Student without access while still owed money (ADR 2). Support follows up.

## Alternatives rejected

- **Add payout states such as "Issued" to the Refund Request status.** It mixes our decision with the processor's progress, and a retry would have to undo a decision.
