"use client";

import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { GridCross } from "@/components/ui/grid-cross";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
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
  const getFloatingElements = () => {
    if (gradientVariant === "signup") {
      return (
        <>
          <div className="absolute top-1/6 right-1/4 w-28 h-28 rounded-full bg-provider-google/5 blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/5 w-36 h-36 rounded-full bg-primary/5 blur-3xl"></div>
          <div className="absolute top-2/3 right-1/5 w-20 h-20 rounded-full bg-provider-custom/5 blur-2xl"></div>
        </>
      );
    }
    return (
      <>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-provider-openai/5 blur-3xl"></div>
        <div className="absolute top-1/2 right-1/6 w-24 h-24 rounded-full bg-provider-anthropic/5 blur-2xl"></div>
      </>
    );
  };

  const getGradientBackground = () => {
    if (gradientVariant === "signup") {
      return `
        radial-gradient(circle at 10% 80%, var(--color-provider-google/10) 0%, transparent 50%),
        radial-gradient(circle at 90% 20%, var(--color-primary/10) 0%, transparent 50%),
        radial-gradient(circle at 60% 60%, var(--color-provider-custom/10) 0%, transparent 50%)
      `;
    }
    return `
      radial-gradient(circle at 20% 20%, var(--color-primary/10) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, var(--color-provider-openai/10) 0%, transparent 50%),
      radial-gradient(circle at 40% 90%, var(--color-provider-anthropic/10) 0%, transparent 50%)
    `;
  };

  const getMaskPattern = () => {
    if (gradientVariant === "signup") {
      return {
        maskImage: `
          radial-gradient(circle at center, transparent 20%, white 100%),
          linear-gradient(-45deg, transparent 0%, white 30%, transparent 60%, white 90%, transparent 100%)
        `,
        backgroundSize: "30px 30px",
        backgroundImage: `
          linear-gradient(var(--color-primary/8) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-primary/8) 1px, transparent 1px)
        `,
      };
    }
    return {
      maskImage: `
        radial-gradient(circle at center, transparent 30%, white 100%),
        linear-gradient(45deg, transparent 0%, white 25%, transparent 50%, white 75%, transparent 100%)
      `,
      backgroundSize: "40px 40px",
      backgroundImage: `
        linear-gradient(var(--color-primary/10) 1px, transparent 1px),
        linear-gradient(90deg, var(--color-primary/10) 1px, transparent 1px)
      `,
    };
  };

  const maskPattern = getMaskPattern();

  return (
    <div className="min-h-screen auth-grid-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <GridCross position="tl" />
        <GridCross position="tr" />
        <GridCross position="bl" />
        <GridCross position="br" />
        {getFloatingElements()}
      </div>

      <div className="relative z-10 p-6">
        <Link
          to="/conversations"
          className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground-default transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to home</span>
        </Link>
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-88px)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl auth-surface mb-6 relative">
              {icon}
              <GridCross
                position="relative"
                size="sm"
                opacity={0.8}
                className="absolute -top-1 -right-1"
              />
            </div>

            <h1 className="text-3xl font-bold text-foreground-default mb-2">
              {title}
            </h1>
            <p className="text-foreground-muted">{subtitle}</p>
          </div>

          <div className="auth-surface p-8 auth-animate-in relative">
            <div className="absolute inset-0 rounded-xl opacity-30 pointer-events-none">
              <div
                className="w-full h-full rounded-xl"
                style={{ background: getGradientBackground() }}
              ></div>
            </div>

            <GridCross
              position="relative"
              size="sm"
              opacity={0.4}
              className="absolute top-4 left-4"
            />
            <GridCross
              position="relative"
              size="sm"
              opacity={0.4}
              className="absolute top-4 right-4"
            />
            <GridCross
              position="relative"
              size="sm"
              opacity={0.4}
              className="absolute bottom-4 left-4"
            />
            <GridCross
              position="relative"
              size="sm"
              opacity={0.4}
              className="absolute bottom-4 right-4"
            />

            <div className="relative z-10">{children}</div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-muted">
              {footerText}{" "}
              <Link
                to={footerLinkHref}
                className="font-medium text-primary hover:text-primary-hover transition-colors relative group"
              >
                {footerLinkText}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full"></span>
              </Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-foreground-muted">
            <Shield className="w-3 h-3" />
            <span>
              {gradientVariant === "signup"
                ? "Your data is encrypted and secure"
                : "Secured with end-to-end encryption"}
            </span>
            <div className="w-1 h-1 rounded-full bg-primary/40 ml-1"></div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          maskImage: maskPattern.maskImage,
          maskComposite: "intersect",
          WebkitMaskImage: maskPattern.maskImage,
          WebkitMaskComposite: "source-in",
        }}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: maskPattern.backgroundImage,
            backgroundSize: maskPattern.backgroundSize,
          }}
        ></div>
      </div>
    </div>
  );
}
