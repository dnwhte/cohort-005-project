# Glossary

The words the whole team uses, in conversation, copy, code and issues. Meanings only, with no code names or implementation details. Rules and their reasons live in `docs/adr/`. Add a word here before you use it.

## People

| Term           | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| Student        | Someone with an Enrollment in a course.                                 |
| Buyer          | The person who made a purchase.                                         |
| Platform Admin | Someone on our team who runs Cadence. Platform Admins decide Refund Requests. |
| Team Admin     | Someone who manages a team's Seats. The Buyer of a Team Purchase becomes one. |
| Seat Holder    | A Student who got their Enrollment by claiming a Seat.                  |

## Access

| Term       | Meaning                                  |
| ---------- | ---------------------------------------- |
| Enrollment | A Student's access to a course's content. |

## Teams

| Term          | Meaning                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| Team Purchase | One purchase of several Seats of a course. It doesn't enroll its Buyer.  |
| Seat          | One place on a course from a Team Purchase.                              |
| Unclaimed     | A Seat nobody has claimed yet.                                           |
| Claimed       | A Seat a Seat Holder has redeemed. It belongs to the team from then on.  |

## Refunds

| Term              | Meaning                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| Refund Request    | A Buyer's request to get their money back for one purchase, with their reason. |
| Pending           | A Refund Request waiting for a Platform Admin to decide.                      |
| Approved          | A Refund Request we agreed to. The purchase will be refunded.                 |
| Declined          | A Refund Request we said no to. Nothing is refunded.                          |
| Refund            | Money we send back for an Approved Refund Request. Not the request itself.    |
| Refundable Amount | What a Refund pays back. It is fixed when the Refund Request is made.         |
| Refund Window     | The 14 calendar days after a purchase in which its Buyer may start a Refund Request. |
| Ineligible        | A purchase whose Buyer can't start a Refund Request right now.                |

Copy may shorten "Refund Request" to "refund" when a status sits next to it, as in "Refund · Pending".

## Words to avoid

| Avoid      | Why                                                                   | Say instead                 |
| ---------- | --------------------------------------------------------------------- | --------------------------- |
| Learner    | We call them Students.                                                | Student                     |
| Admin      | Ambiguous: it could mean either kind.                                 | Platform Admin / Team Admin |
| Coupon     | A Seat isn't a discount.                                              | Seat                        |
| Cancel     | Sounds instant. Nothing ends until a Platform Admin Approves.         | Request a refund            |
| Chargeback | A bank dispute the cardholder opens. Not something we handle.         | Refund Request              |
