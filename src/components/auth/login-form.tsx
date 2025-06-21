"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface LoginFormProps {
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
  callbackURL?: string;
}

export function LoginForm({ className, callbackURL }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        callbackURL,
      });

      if (result?.error) {
        setError(result.error.message || "An error occurred during signin");
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
      if (field === "rememberMe") {
        setFormData((prev) => ({
          ...prev,
          [field]: e.target.checked,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: e.target.value,
        }));
      }
    };

  return (
    <div className={cn("w-full space-y-6", className)}>
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground-default font-sans">
          Welcome back
        </h1>
        <p className="text-sm text-foreground-muted font-sans">
          Enter your credentials to access your account
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <OAuthButtons callbackURL={callbackURL} mode="signin" />

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
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground-default font-sans"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary hover:text-primary-hover transition-colors font-sans"
            >
              Forgot password?
            </Link>
          </div>
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

        <div className="flex items-center space-x-2">
          <input
            id="remember-me"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={handleInputChange("rememberMe")}
            disabled={isLoading}
            className="h-4 w-4 rounded border-border-default text-primary focus:ring-primary/50 focus:ring-2 focus:ring-offset-0"
          />
          <label
            htmlFor="remember-me"
            className="text-sm text-foreground-default font-sans"
          >
            Remember me
          </label>
        </div>

        <Button
          type="submit"
          className="w-full font-sans"
          disabled={isLoading || !formData.email || !formData.password}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-foreground-muted font-sans">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
