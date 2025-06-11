import { LoginForm } from "@/components/auth/login-form";
import { Lock } from "lucide-react";
import { AuthLayout } from "@/components/layout/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      icon={<Lock className="w-8 h-8 text-primary" />}
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/signup"
      gradientVariant="login"
    >
      <LoginForm />
    </AuthLayout>
  );
}
