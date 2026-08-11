/**
 * Keeps the shared assistant composer compact when empty and lets it grow
 * smoothly for multi-line questions. The measurement reset is intentional:
 * scrollHeight otherwise only expands after a textarea has grown once.
 */
export function resizeAssistantComposer(textarea: HTMLTextAreaElement) {
  const currentHeight = textarea.getBoundingClientRect().height;
  textarea.style.transition = "none";
  textarea.style.height = "0px";
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, 40), 140);
  textarea.style.height = `${currentHeight}px`;
  void textarea.offsetHeight;
  textarea.style.transition = "";
  textarea.style.height = `${nextHeight}px`;
}
