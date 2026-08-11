export const WORKSPACE_FRAME_SLOTS = [
  "rail",
  "canvas",
  "topbar",
  "content",
  "utilities",
] as const;

export type WorkspaceFrameSlot = (typeof WORKSPACE_FRAME_SLOTS)[number];

export type WorkspaceRouteMatch = {
  href: string;
  pathname: string;
  exact?: boolean;
  aliases?: readonly string[];
};

/**
 * Visual chrome is shared, but each workspace retains its own navigation map.
 * This keeps active-route behavior consistent without coupling customer and
 * internal navigation labels, data, or permissions.
 */
export function isWorkspaceRouteActive({
  href,
  pathname,
  exact = false,
  aliases = [],
}: WorkspaceRouteMatch): boolean {
  if (exact) return pathname === href;

  return [href, ...aliases].some(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
}
