# 4. Team Purchases are refunded all or nothing

- Status: Accepted. Not built yet: a separate issue that ships after ADRs 1–3.
- Date: 2026-11-13

## Context

A Team Purchase is one `purchases` row with `amountPaid = seat price × quantity`, plus one `coupons` row per Seat. Its Buyer becomes the Team Admin and isn't enrolled. Today:

- The Buyer never sees the course-page refund button, because it requires an Enrollment.
- One claimed Seat makes the whole purchase Ineligible.
- `getRefundableAmount` returns one Seat's list price for a Team Purchase without a purchasing-power price.
- A coupon can't be voided.

## Decision

- A Team Purchase is refunded **whole or not at all**, and only while **every Seat is Unclaimed**. One Claimed Seat, even one the Buyer claimed, makes it Ineligible. Claimed Seats belong to the team.
- The **Buyer** starts it on `/team` with **Request a refund**, the same name as the course-page action for individual purchases.
- The **Refund Window** applies. The progress limits don't, because Unclaimed Seats have no progress.
- **Refundable Amount** is `amountPaid`.
- **Seat state** comes from the Team Purchase's Refund Request. There's no new column.
  - request Pending → every Seat **Held** (the link says "This Seat isn't available right now")
  - Approved → every Seat **Refunded** (the link is dead, and the Seat doesn't count toward the team's Seats)
  - Declined → every Seat **Unclaimed** again
- Normal rules apply: one Pending request at a time, no partial refunds, and no new request after an Approve.
- These requests appear in the same Platform Admin list, labelled Team Purchase. Their rows show the Seat count and the amount, with no progress columns. Approving ends no Enrollment.
- Emails go to the Buyer.

## Consequences

- No schema change. `/team`, `redeem.$code`, eligibility and the admin screen read the purchase's latest Refund Request.
- Starting the request and redeeming a link must both check the other atomically. Otherwise a Seat claimed at the same moment as the request slips through.
- A team that has used even one Seat can't get money back for the rest. Support has to handle those cases by hand until there's demand for more.
- Fixes the one-Seat Refundable Amount bug, because the amount is simply what was paid.

## Alternatives rejected

- **Refund per Unclaimed Seat** (designed first, then dropped). It needs a per-Seat price, Seat selection, a `coupons.refund_id` link, several Approved requests per purchase, and a rewrite of "no partial refunds". That's a lot of model for a rare case.
- **Refund Claimed Seats by taking them back.** It ends someone else's Enrollment.
- **Let Seats be claimed while the request is Pending.** The Platform Admin could end up refunding a Seat that's in use.
- **Delete coupons on Approve.** It silently changes the totals on `/team` and loses the record of the Seats.
