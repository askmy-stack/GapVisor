import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";

export const DEMO_EMAIL = "demo@northstar.dev";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Display identity for the account menus plus a sign out that always lands on /signin. */
export function useAccount() {
  const { user, memberships, signOut } = useAuth();
  const navigate = useNavigate();

  const name = user?.name || user?.email || "Demo workspace";
  const email = user?.email ?? DEMO_EMAIL;
  const workspace = memberships[0]?.workspace_name;
  const initials = user ? initialsFor(user.name || user.email) : "DW";

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Demo mode or API offline: there is no server session to end.
    }
    toast.success("Signed out");
    navigate("/signin");
  }, [navigate, signOut]);

  return { name, email, workspace, initials, isDemo: !user, signOut: handleSignOut };
}
