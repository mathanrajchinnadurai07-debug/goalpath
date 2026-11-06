"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, Language } from "@/lib/i18n";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
  language: Language;
  theme: "light" | "dark" | "system";
  role: "USER" | "ADMIN";
  twoFactorEnabled: boolean;
}

interface AppContextType {
  user: UserProfile | null;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  t: typeof translations["en"];
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<Language>("en");
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("light");

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        if (data.user.language) setLanguageState(data.user.language as Language);
        if (data.user.theme) setThemeState(data.user.theme as any);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/" || path === "/login" || path === "/signup" || path.startsWith("/shared/")) {
      setLoading(false);
      return;
    }
    refreshUser();
  }, []);

  useEffect(() => {
    // Apply theme to document root
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isSystemDark) root.classList.add("dark");
      else root.classList.remove("dark");
    }
  }, [theme]);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    if (user) {
      await fetch("/api/v1/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {});
    }
  };

  const setTheme = async (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
    if (user) {
      await fetch("/api/v1/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      }).catch(() => {});
    }
  };

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  };

  const t = translations[language] || translations.en;

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        language,
        setLanguage,
        theme,
        setTheme,
        t,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
