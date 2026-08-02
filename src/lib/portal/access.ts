export function portalRoleCanWrite(role: string) {
  return ["owner", "admin", "member"].includes(role);
}
