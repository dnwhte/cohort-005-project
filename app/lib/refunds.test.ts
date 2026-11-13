import { describe, it, expect, vi } from "vitest";

vi.mock("~/db", () => ({ db: {} }));

import { RefundStatus } from "~/db/schema";
import { getIneligibleReason, type RefundFacts } from "./refunds.server";

const purchasedAt = new Date(2026, 0, 1, 23, 0);

const eligible: RefundFacts = {
  purchasedAt,
  today: new Date(2026, 0, 5),
  latestRequestStatus: null,
  hasClaimedSeat: false,
  lessonCount: 10,
  completedLessonCount: 0,
  secondsWatched: 0,
};

const reason = (overrides: Partial<RefundFacts>) =>
  getIneligibleReason({ ...eligible, ...overrides });

describe("getIneligibleReason", () => {
  it("allows a fresh purchase", () => {
    expect(reason({})).toBeNull();
  });

  it("blocks while a request is Pending", () => {
    expect(reason({ latestRequestStatus: RefundStatus.Requested })?.status).toBe(409);
  });

  it("blocks after an Approved request (one Refund per purchase)", () => {
    expect(reason({ latestRequestStatus: RefundStatus.Approved })?.message).toMatch(
      /already been refunded/
    );
  });

  it("allows a new request after a Decline", () => {
    expect(reason({ latestRequestStatus: RefundStatus.Declined })).toBeNull();
  });

  it("blocks a claimed team seat", () => {
    expect(reason({ hasClaimedSeat: true })?.status).toBe(403);
  });

  it("keeps the whole fourteenth calendar day in the window", () => {
    expect(reason({ today: new Date(2026, 0, 15, 23, 59) })).toBeNull();
    expect(reason({ today: new Date(2026, 0, 16, 0, 1) })?.message).toMatch(/window/);
  });

  it("blocks at half the lessons completed", () => {
    expect(reason({ completedLessonCount: 4 })).toBeNull();
    expect(reason({ completedLessonCount: 5 })?.message).toMatch(/completed/);
  });

  it("blocks at two hours watched", () => {
    expect(reason({ secondsWatched: 7199 })).toBeNull();
    expect(reason({ secondsWatched: 7200 })?.message).toMatch(/watched/);
  });
});
