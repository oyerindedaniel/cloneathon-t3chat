"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface SignupFormProps {
  className?: string;
  callbackURL?: string;
}

export function SignupForm({ className, callbackURL }: SignupFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signUp } = useAuth();

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        callbackURL,
      });

      if (result?.error) {
        setError(result.error.message || "An error occurred during signup");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      if (error) {
        setError(null);
      }
    };

  return (
    <div className={cn("w-full space-y-6", className)}>
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground-default font-sans">
          Create account
        </h1>
        <p className="text-sm text-foreground-muted font-sans">
          Get started with your AI conversations
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <OAuthButtons callbackURL={callbackURL} mode="signup" />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface-primary px-3 text-foreground-muted font-sans">
              Or continue with
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <label
            htmlFor="name"
            className="text-sm font-medium text-foreground-default font-sans mb-1 inline-block"
          >
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleInputChange("name")}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground-default font-sans mb-1 inline-block"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleInputChange("email")}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground-default font-sans mb-1 inline-block"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={formData.password}
            onChange={handleInputChange("password")}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-foreground-default font-sans mb-1 inline-block"
          >
            Confirm Password
          </label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="********"
            value={formData.confirmPassword}
            onChange={handleInputChange("confirmPassword")}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          className="w-full font-sans"
          disabled={
            isLoading ||
            !formData.name ||
            !formData.email ||
            !formData.password ||
            !formData.confirmPassword
          }
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-foreground-muted font-sans">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="text-xs text-foreground-muted text-center font-sans">
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </div>
    </div>
  );
}
