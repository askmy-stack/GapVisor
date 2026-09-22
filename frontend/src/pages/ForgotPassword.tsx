import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Placeholder until M1 password-reset endpoints ship. */
export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-muted-foreground text-sm">
          Password reset emails are not wired yet (Milestone 1). Use the demo
          account <code className="font-mono text-xs">demo@northstar.dev</code>{" "}
          when the API is running, or continue in static demo mode from sign-in.
        </p>
        <Button asChild>
          <Link to="/signin">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
