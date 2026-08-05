import Image from "next/image";

type CostivraAssistantIconProps = {
  size?: number;
  className?: string;
};

/** Dedicated visual marker for Ask Costivra, distinct from the company mark. */
export function CostivraAssistantIcon({ size = 20, className }: CostivraAssistantIconProps) {
  return (
    <Image
      src="/brand/ai-chat-concepts/evidence-signal-white-safe.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      sizes={`${size}px`}
      className={["assistant-icon-image", className].filter(Boolean).join(" ")}
    />
  );
}
