export function actionOperationConfirmation(operation: string) {
  if (operation === "complete") return "Action completed.";
  if (operation === "start") return "Action started.";
  if (operation === "approve") return "Action approved.";
  if (operation === "decline") return "Action declined.";
  return "Action updated.";
}
