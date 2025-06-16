"use client";

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ModeToggler } from "../mode-toggler";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
  gradientVariant?: "login" | "signup";
}

export function AuthLayout({
  children,
  title,
  subtitle,
  icon,
  footerText,
  footerLinkText,
  footerLinkHref,
  gradientVariant = "login",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background-default relative grid-pattern-background py-6">
      <div className="relative z-10 p-6 flex justify-between items-center bg-transparent">
        <Link
          to="/conversations"
          className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground-default transition-colors group font-sans"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to home</span>
        </Link>
        {/* <ModeToggler /> */}
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-88px)]">
        <div className="w-full max-w-sm">
          {(title || subtitle || icon) && (
            <div className="text-center mb-8">
              {icon && (
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background-subtle mb-4">
                  {icon}
                </div>
              )}
              {title && (
                <h1 className="text-2xl font-semibold text-foreground-default mb-2 font-sans">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-foreground-muted font-sans">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          <div className="relative">{children}</div>

          {footerText && footerLinkText && footerLinkHref && (
            <div className="mt-6 text-center">
              <p className="text-sm text-foreground-muted font-sans">
                {footerText}{" "}
                <Link
                  to={footerLinkHref}
                  className="font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  {footerLinkText}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
