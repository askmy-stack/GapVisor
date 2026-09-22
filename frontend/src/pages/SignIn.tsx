import { SignInForm } from "@/components/SignIn/SignInForm";
import { ShowcasePanel } from "@/components/SignIn/ShowcasePanel";

export default function SignIn() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <main className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <SignInForm />
      </main>
      <ShowcasePanel />
    </div>
  );
}