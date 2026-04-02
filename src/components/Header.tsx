import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Features", href: "#features" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

/** Resolves the correct dashboard URL based on the user's role */
function DashboardLink({ className }: { className?: string }) {
  const user = useQuery(api.users.getCurrentUser);
  if (user === undefined || user === null) {
    return <Skeleton className="h-9 w-24" />;
  }
  const href =
    user.role === "admin"
      ? "/admin"
      : user.role === "agent"
        ? "/agent"
        : user.role === "contributor"
          ? "/contributor"
          : "/onboarding";
  return (
    <Button size="sm" asChild className={className}>
      <Link to={href}>Dashboard</Link>
    </Button>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://hercules-cdn.com/file_MvdcHn3Luis6KlyAOhCjHtE8"
              alt="OWODE Financial Group"
              className="h-10 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <AuthLoading>
              <Skeleton className="h-9 w-20" />
            </AuthLoading>
            <Unauthenticated>
              <SignInButton variant="ghost" size="sm" />
              <SignInButton size="sm" signInText="Get Started" showIcon={false} />
            </Unauthenticated>
            <Authenticated>
              <DashboardLink />
              <SignInButton size="sm" variant="ghost" />
            </Authenticated>
          </div>

          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-b border-border overflow-hidden"
          >
            <nav className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ),
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <AuthLoading>
                  <Skeleton className="h-9 w-full" />
                </AuthLoading>
                <Unauthenticated>
                  <SignInButton
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                  />
                  <SignInButton
                    size="sm"
                    signInText="Get Started"
                    showIcon={false}
                  />
                </Unauthenticated>
                <Authenticated>
                  <DashboardLink className="w-full" />
                  <SignInButton
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                  />
                </Authenticated>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
