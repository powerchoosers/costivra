"use client";

import type { AssistantBlockV1 } from "@/lib/client-assistant/types";
import { RenderAssistantCard } from "./cards/card-registry";

export function ResponseBlockRenderer({ block }: { block: AssistantBlockV1 }) {
  return <RenderAssistantCard block={block} />;
}
