/**
 * Where to send someone after sign in: the protected page RequireAuth bounced
 * them from, when it is a safe in-app path, otherwise the dashboard.
 */
export function postSignInPath(state: unknown): string {
  const from =
    state && typeof state === "object" && "from" in state ? (state as { from?: unknown }).from : undefined;
  if (typeof from !== "string") return "/dashboard";
  // Only same-app absolute paths; reject protocol-relative URLs and auth pages.
  if (!from.startsWith("/") || from.startsWith("//")) return "/dashboard";
  if (from === "/" || from.startsWith("/signin") || from.startsWith("/forgot-password")) return "/dashboard";
  return from;
}
