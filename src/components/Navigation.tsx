"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Calendar,
  Activity,
  Heart,
  Users,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Sun,
  Moon,
  Globe,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function Navigation() {
  const pathname = usePathname();
  const { user, t, language, setLanguage, theme, setTheme, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on public pages like landing, login, signup, onboarding, or shared goal, hide full sidebar
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/shared/")
  ) {
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: Target },
    { href: "/goals", label: t.nav.goals, icon: Sparkles },
    { href: "/planner", label: t.nav.planner, icon: Calendar },
    { href: "/habits", label: t.nav.habits, icon: Activity },
    { href: "/gratitude", label: t.nav.gratitude, icon: Heart },
    { href: "/community", label: t.nav.community, icon: Users },
    { href: "/analytics", label: t.nav.reviews, icon: BarChart3 },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  if (user?.role === "ADMIN") {
    navItems.push({ href: "/admin", label: t.nav.admin, icon: Shield });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card fixed top-0 bottom-0 left-0 z-40">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <Link href="/dashboard" prefetch={false} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-foreground block">GoalPath</span>
              <span className="text-[10px] text-muted-foreground font-medium block leading-none">Execute & Appreciate</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Toggles: Language & Theme */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <button
            onClick={() => setLanguage(language === "en" ? "ta" : "en")}
            className="flex items-center gap-1.5 hover:text-foreground px-2 py-1 rounded bg-secondary/60 hover:bg-secondary transition"
            title="Toggle Language (English / தமிழ்)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === "en" ? "தமிழ்" : "English"}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-1.5 hover:text-foreground p-1.5 rounded bg-secondary/60 hover:bg-secondary transition"
            title="Toggle Dark/Light Mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-border">
          {user ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{user.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={false}
              className="block text-center py-2 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card sticky top-0 z-40">
        <Link href="/dashboard" prefetch={false} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <Target className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">GoalPath</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === "en" ? "ta" : "en")}
            className="p-1.5 rounded-md hover:bg-secondary text-foreground text-xs font-medium"
            title="Toggle Language"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md hover:bg-secondary text-foreground"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md hover:bg-secondary text-foreground"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-background/95 backdrop-blur-sm z-50 p-4 overflow-y-auto">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              <span>{t.nav.logout}</span>
            </button>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur flex justify-around py-2 z-40"
        aria-label="Mobile Bottom Navigation"
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] font-medium transition ${
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
