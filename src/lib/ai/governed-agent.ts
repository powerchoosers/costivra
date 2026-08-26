import { randomUUID } from "node:crypto";
import { z } from "zod";

const agentContractSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  displayName: z.string().min(3).max(120),
  contractVersion: z.string().min(1).max(80),
  instructionsVersion: z.string().min(1).max(80),
  modelConfigurationVersion: z.string().min(1).max(120),
  allowedActions: z.array(z.string().min(1).max(120)).min(1).max(20),
  prohibitedActions: z.array(z.string().min(1).max(160)).min(1).max(30),
  maxSteps: z.number().int().min(1).max(20),
  maxTokens: z.number().int().min(0).max(100_000),
  timeoutMs: z.number().int().min(1_000).max(300_000),
  maxRetries: z.number().int().min(0).max(5),
  externalSideEffectsAllowed: z.literal(false),
  escalationConditions: z.array(z.string().min(1).max(160)).min(1).max(20),
});

export type GovernedAgentContract = z.infer<typeof agentContractSchema>;

export type GovernedAgentScope = {
  organizationId: string;
  documentId?: string;
  traceId?: string;
};

export type GovernedAgentTrace = {
  traceId: string;
  agentId: string;
  contractVersion: string;
  instructionsVersion: string;
  modelConfigurationVersion: string;
  organizationId: string;
  documentId: string | null;
  maxSteps: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  outcome: "completed" | "failed";
  failureCode?: "timeout" | "execution_failed";
};

export class GovernedAgentExecutionError extends Error {
  constructor(message: string, readonly trace: GovernedAgentTrace) {
    super(message);
    this.name = "GovernedAgentExecutionError";
  }
}

export function defineGovernedAgentContract(input: GovernedAgentContract): Readonly<GovernedAgentContract> {
  return Object.freeze(agentContractSchema.parse(input));
}

export function safeAgentTraceMetadata(traces: Array<GovernedAgentTrace | null | undefined>) {
  return traces.flatMap((trace) => trace ? [{
    trace_id: trace.traceId,
    agent_id: trace.agentId,
    contract_version: trace.contractVersion,
    instructions_version: trace.instructionsVersion,
    model_configuration_version: trace.modelConfigurationVersion,
    outcome: trace.outcome,
    duration_ms: trace.durationMs,
    failure_code: trace.failureCode ?? null,
  }] : []);
}

export function agentTraceFromError(error: unknown): GovernedAgentTrace | null {
  return error instanceof GovernedAgentExecutionError ? error.trace : null;
}

function assertScope(scope: GovernedAgentScope) {
  if (!scope.organizationId.trim()) throw new Error("A governed agent requires an organization scope.");
  if (scope.documentId !== undefined && !scope.documentId.trim()) {
    throw new Error("A governed agent document scope cannot be blank.");
  }
}

export async function runGovernedAgent<T>(input: {
  contract: Readonly<GovernedAgentContract>;
  scope: GovernedAgentScope;
  execute: (signal: AbortSignal) => Promise<T>;
  now?: () => Date;
}): Promise<{ output: T; trace: GovernedAgentTrace }> {
  assertScope(input.scope);
  const contract = agentContractSchema.parse(input.contract);
  const now = input.now ?? (() => new Date());
  const started = now();
  const traceBase = {
    traceId: input.scope.traceId?.trim() || randomUUID(),
    agentId: contract.id,
    contractVersion: contract.contractVersion,
    instructionsVersion: contract.instructionsVersion,
    modelConfigurationVersion: contract.modelConfigurationVersion,
    organizationId: input.scope.organizationId,
    documentId: input.scope.documentId ?? null,
    maxSteps: contract.maxSteps,
    maxTokens: contract.maxTokens,
    timeoutMs: contract.timeoutMs,
    maxRetries: contract.maxRetries,
    startedAt: started.toISOString(),
  };

  const controller = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error(`The ${contract.displayName} exceeded its ${contract.timeoutMs} ms timeout.`));
    }, contract.timeoutMs);
  });

  try {
    const output = await Promise.race([input.execute(controller.signal), deadline]);
    const completed = now();
    return {
      output,
      trace: {
        ...traceBase,
        completedAt: completed.toISOString(),
        durationMs: Math.max(0, completed.valueOf() - started.valueOf()),
        outcome: "completed",
      },
    };
  } catch (error) {
    const completed = now();
    const durationMs = Math.max(0, completed.valueOf() - started.valueOf());
    const trace: GovernedAgentTrace = {
      ...traceBase,
      completedAt: completed.toISOString(),
      durationMs,
      outcome: "failed",
      failureCode: timedOut ? "timeout" : "execution_failed",
    };
    const message = error instanceof Error ? error.message : "The governed agent could not complete its assigned work.";
    throw new GovernedAgentExecutionError(message, trace);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
