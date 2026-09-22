import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/auth/AuthProvider";
import { ApiError } from "@/api/client";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function SignInForm() {
  const navigate = useNavigate();
  const { signIn, liveApi } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      const mode = await signIn(values.email, values.password);
      if (mode === "demo") {
        toast.message("API offline — opening demo workspace");
        navigate("/workspace-setup");
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to sign in";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-foreground rounded-sm rotate-45" />
          </div>
          <span className="text-xl font-bold tracking-tight">GapVisor</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to monitor your AI recommendation visibility
        </p>
        {!liveApi && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Backend unreachable — form still opens the static demo. Start
            docker compose for live auth (
            <code className="font-mono">demo@northstar.dev</code>).
          </p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          type="button"
          className="w-full"
          disabled
          title="Google OAuth lands in M1"
        >
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          Google
        </Button>
        <Button
          variant="outline"
          type="button"
          className="w-full"
          disabled
          title="Microsoft OAuth lands in M1"
        >
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="microsoft" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
            <path fill="#F25022" d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"></path>
          </svg>
          Microsoft
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have a workspace yet?{" "}
        <Link
          to="/workspace-setup"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
        {" · "}
        <Link to="/grader" className="font-medium text-primary hover:underline">
          Free grader
        </Link>
      </p>

      <div className="pt-8">
        <div className="flex items-center justify-center gap-4 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div className="flex items-center gap-1 border border-border px-2 py-0.5 rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            SOC 2 roadmap
          </div>
          <div className="flex items-center gap-1 border border-border px-2 py-0.5 rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            US-hosted · privacy safeguards
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] text-muted-foreground/60 leading-relaxed">
          By signing in, you agree to our Terms of Service and Privacy Policy.
          GapVisor is a trademark of GapVisor Inc.
          v1 runs in US regions only — we do not claim EU data residency yet.
        </p>
      </div>
    </div>
  );
}
