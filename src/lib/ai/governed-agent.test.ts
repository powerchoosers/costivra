import { describe, expect, it, vi } from "vitest";
import {
  GovernedAgentExecutionError,
  defineGovernedAgentContract,
  runGovernedAgent,
  safeAgentTraceMetadata,
} from "./governed-agent";

const contract = defineGovernedAgentContract({
  id: "test-agent",
  displayName: "Test Agent",
  contractVersion: "v1",
  instructionsVersion: "v1",
  modelConfigurationVersion: "deterministic-v1",
  allowedActions: ["read_record"],
  prohibitedActions: ["send_external_communication"],
  maxSteps: 1,
  maxTokens: 0,
  timeoutMs: 5_000,
  maxRetries: 0,
  externalSideEffectsAllowed: false,
  escalationConditions: ["record_requires_review"],
});

describe("governed agent contract", () => {
  it("records a tenant- and document-scoped, non-sensitive execution trace", async () => {
    const result = await runGovernedAgent({
      contract,
      scope: { organizationId: "org-1", documentId: "doc-1", traceId: "trace-1" },
      now: (() => {
        const timestamps = [new Date("2026-08-25T00:00:00.000Z"), new Date("2026-08-25T00:00:00.025Z")];
        return () => timestamps.shift() ?? new Date("2026-08-25T00:00:00.025Z");
      })(),
      execute: async () => ({ classification: "invoice" }),
    });

    expect(result.output).toEqual({ classification: "invoice" });
    expect(result.trace).toMatchObject({
      traceId: "trace-1",
      agentId: "test-agent",
      organizationId: "org-1",
      documentId: "doc-1",
      outcome: "completed",
      durationMs: 25,
    });
    expect(safeAgentTraceMetadata([result.trace])).toEqual([expect.objectContaining({
      trace_id: "trace-1",
      agent_id: "test-agent",
      outcome: "completed",
    })]);
    expect(safeAgentTraceMetadata([result.trace])[0]).not.toHaveProperty("organization_id");
    expect(safeAgentTraceMetadata([result.trace])[0]).not.toHaveProperty("document_id");
  });

  it("preserves a safe failure trace for the workflow to audit", async () => {
    await expect(runGovernedAgent({
      contract,
      scope: { organizationId: "org-1", documentId: "doc-1", traceId: "trace-2" },
      execute: async () => { throw new Error("provider unavailable"); },
    })).rejects.toEqual(expect.objectContaining({
      name: "GovernedAgentExecutionError",
      trace: expect.objectContaining({ traceId: "trace-2", outcome: "failed", failureCode: "execution_failed" }),
    }) satisfies Partial<GovernedAgentExecutionError>);
  });

  it("fails closed when the organization scope is absent", async () => {
    await expect(runGovernedAgent({
      contract,
      scope: { organizationId: "" },
      execute: async () => "unreachable",
    })).rejects.toThrow("organization scope");
  });

  it("aborts an agent that exceeds its declared timeout", async () => {
    vi.useFakeTimers();
    try {
      const execution = runGovernedAgent({
        contract,
        scope: { organizationId: "org-1", documentId: "doc-1", traceId: "trace-timeout" },
        execute: async (signal) => new Promise<string>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
      });
      const rejection = expect(execution).rejects.toEqual(expect.objectContaining({
        trace: expect.objectContaining({ traceId: "trace-timeout", outcome: "failed", failureCode: "timeout" }),
      }));
      await vi.advanceTimersByTimeAsync(5_000);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
