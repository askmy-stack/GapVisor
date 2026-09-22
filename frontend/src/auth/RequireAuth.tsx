import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";

/**
 * Guards dashboard routes when the live API is up and a session exists.
 * When the API is offline (static demo / CloudFront-only deploy), allow through
 * so the existing JSON-backed screens keep working.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, liveApi, user } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (liveApi && !user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
