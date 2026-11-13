# 2. Approval ends the Enrollment immediately and keeps the Learner's progress

- Status: Accepted
- Date: 2026-11-13

## Context

Course access is a row in `enrollments`. Progress is stored separately, per user and lesson, in `lesson_progress`, `quiz_attempts` and `video_watch_events`. Refunds (money actually sent back) aren't built yet; they arrive with the payment processor.

We had to decide when access ends (on request, on Approve, or when the Refund is Succeeded) and what happens to progress.

## Decision

- While a request is **Pending**, the Learner keeps full access. Instead, the Platform Admin screen shows progress measured now and warns when a limit was passed after the request was made.
- On **Approve**, the `enrollments` row is deleted in the same transaction as the status change. Access ends at once.
- Lesson progress, quiz attempts and watch events are **kept**.
- The Buyer may buy the course again as a new purchase. Their old progress comes back and counts toward the refund limits on that new purchase (see ADR 3).

## Consequences

- Access doesn't depend on the payment processor. If we waited for a Succeeded Refund, which doesn't exist yet, access would never end.
- If a Refund later Fails, the Learner has already lost access while still owed money. The glossary treats Failed as "we're on it" and retries with a new Refund. Access isn't restored.
- Keeping progress keeps the evidence behind the decision and makes buying again painless. Without an Enrollment the progress isn't visible.
- The 50% completed and 2-hours-watched limits can't be reset by buying, getting a refund and buying again.

## Alternatives rejected

- **End access when the request is made.** It punishes Learners whose request is then Declined.
- **End access when the Refund is Succeeded.** That's blocked on unbuilt work, and payouts can fail and be retried.
- **Delete progress.** It can't be undone, it destroys audit evidence, and it would make it possible to reset the limits.
