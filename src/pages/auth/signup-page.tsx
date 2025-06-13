import { SignupForm } from "@/components/auth/signup-form";
import { AuthLayout } from "@/components/layout/auth-layout";

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
