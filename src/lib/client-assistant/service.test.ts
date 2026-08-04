import { describe, it, expect, vi } from "vitest";
import { executeAssistantTurn } from "./service";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("executeAssistantTurn", () => {
  it("rejects turn when chat session is not found or access is denied", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(
      executeAssistantTurn({
        db: mockDb,
        organizationId: "org-1",
        userId: "user-1",
        sessionId: "sess-missing",
        clientRequestId: "req-1",
        prompt: "Hello Costivra",
      }),
    ).rejects.toThrow("Chat session not found or access denied.");
  });

  it("returns existing cached result for duplicate clientRequestId", async () => {
    const mockSession = { id: "sess-1", organization_id: "org-1", user_id: "user-1" };
    const mockUserMsg = { id: "msg-user-1" };
    const mockAssistantMsg = {
      id: "msg-asst-1",
      content: "Cached answer",
      status: "complete",
      response_blocks: [],
      metadata: { citations: [] },
    };

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "chat_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: mockSession, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "chat_messages") {
          return {
            select: () => ({
              eq: (col: string) => {
                if (col === "session_id") {
                  return {
                    eq: () => ({
                      maybeSingle: async () => ({ data: mockUserMsg, error: null }),
                    }),
                  };
                }
                if (col === "reply_to_message_id") {
                  return {
                    maybeSingle: async () => ({ data: mockAssistantMsg, error: null }),
                  };
                }
                return {
                  maybeSingle: async () => ({ data: null, error: null }),
                };
              },
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await executeAssistantTurn({
      db: mockDb,
      organizationId: "org-1",
      userId: "user-1",
      sessionId: "sess-1",
      clientRequestId: "req-dup",
      prompt: "Duplicate turn test",
    });

    expect(result.content).toBe("Cached answer");
    expect(result.assistantMessageId).toBe("msg-asst-1");
  });
});
