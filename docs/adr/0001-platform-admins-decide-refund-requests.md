# 1. Only Platform Admins decide Refund Requests, and decisions are final

- Status: Accepted
- Date: 2026-11-13

## Context

There was no way to Approve or Decline a Pending Refund Request. The app has two kinds of admin: `UserRole.Admin`, who runs Cadence, and `TeamMemberRole.Admin`, who manages a team's Seats. Course actions elsewhere are open to "staff" (the owning instructor or an admin) through `requireStaff`.

## Decision

- Only **Platform Admins** (`UserRole.Admin`) Approve or Decline, on `/admin/refunds`. Owning instructors and Team Admins never decide.
- The page lists Pending Refund Requests only, oldest first. Each row has both **Approve** and **Decline**, with no free-text note.
- A decision is **final**. Deciding sets `status`, `resolvedAt` and `resolvedByUserId`, but only on a row that is still Pending. A second Platform Admin acting on the same request gets "already decided".
- Each decision sends the Buyer an email. The request email already promises "we will email you again when it is done".

## Consequences

- A refund is a money decision, so it isn't tied to who owns the course content.
- The bare word "Admin" is now ambiguous, so the glossary bans it in favour of Platform Admin and Team Admin.
- Undoing a decision means restoring access and cancelling a Refund. That needs its own feature and isn't possible today.
- There is no history view or audit screen yet. `resolvedByUserId` keeps the data for one.

## Alternatives rejected

- **Owning instructor may decide too (`requireStaff`).** Instructors have a conflict of interest, and refunds are a platform policy.
- **Allow a decision to be reversed.** Reversing an Approve has side effects (Enrollment, Seats, Refund) that we don't want to design yet.
