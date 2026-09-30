import { Navigate, useLocation } from "react-router-dom";
import { SignInForm } from "@/components/SignIn/SignInForm";
import { ShowcasePanel } from "@/components/SignIn/ShowcasePanel";
import { useAuth } from "@/auth/AuthProvider";
import { postSignInPath } from "@/auth/redirect";

export default function SignIn() {
  const { user } = useAuth();
  const location = useLocation();

  // Already signed in: skip the form.
  if (user) return <Navigate to={postSignInPath(location.state)} replace />;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <main className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <SignInForm />
      </main>
      <ShowcasePanel />
    </div>
  );
}
