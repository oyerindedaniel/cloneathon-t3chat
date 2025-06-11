import { SignupForm } from "@/components/auth/signup-form";
import { UserPlus } from "lucide-react";
import { AuthLayout } from "@/components/layout/auth-layout";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create account"
      subtitle="Get started with your AI conversations"
      icon={<UserPlus className="w-8 h-8 text-primary" />}
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
      gradientVariant="signup"
    >
      <SignupForm />
    </AuthLayout>
  );
}
