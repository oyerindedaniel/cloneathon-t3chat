"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  className?: string;
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
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground-default">
          Welcome back
        </h1>
        <p className="text-sm text-foreground-muted">
          Sign in to your T3 Chat Cloneathon account
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* OAuth Buttons */}
      <OAuthButtons callbackURL={callbackURL} mode="signin" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground-default"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleInputChange("email")}
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground-default"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
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
            className="h-4 w-4 rounded border-default text-primary focus:ring-primary/50"
          />
          <label
            htmlFor="remember-me"
            className="text-sm text-foreground-default"
          >
            Remember me
          </label>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !formData.email || !formData.password}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-foreground-muted">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
