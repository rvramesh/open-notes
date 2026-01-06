"use client";

import * as React from "react";
import { useSettings } from "@/hooks/use-settings";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  const settings = useSettings();
  const [theme, setThemeState] = React.useState<Theme>((settings.theme as Theme) || defaultTheme);

  // Update local state when settings theme changes
  React.useEffect(() => {
    setThemeState(settings.theme as Theme);
  }, [settings.theme]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    // Persist to settings store (auto-saves)
    settings.setTheme(newTheme);
    if (typeof window !== "undefined") {
      applyTheme(newTheme);
    }
  }, [settings]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      applyTheme(theme);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  let activeTheme = theme;

  if (theme === "system" && typeof window !== "undefined") {
    activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  if (activeTheme === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}
