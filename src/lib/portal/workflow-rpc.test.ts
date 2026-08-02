import { describe, expect, it } from "vitest";
import { workflowRpcError } from "./workflow-rpc";

describe("workflow RPC errors", () => {
  it("maps concurrency and evidence failures to safe customer messages", () => {
    expect(workflowRpcError({ message: "ACTION_INVALID_TRANSITION:approved:cancelled" })).toEqual({
      status: 409,
      message: "That action has already changed. Refresh and try again.",
    });
    expect(workflowRpcError({ message: "SAVINGS_EVIDENCE_REQUIRED" })?.status).toBe(409);
  });

  it("does not expose unknown database messages", () => {
    expect(workflowRpcError({ message: "database connection contained private detail" })).toBeNull();
  });
});
