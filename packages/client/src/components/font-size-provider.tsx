import React, { useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";

interface FontSizeProviderProps {
  children: React.ReactNode;
}

/**
 * Font Size Provider
 * 
 * Applies font size CSS classes to the root element based on settings store.
 * Maps fontSize preferences to CSS custom properties and Tailwind classes.
 */
export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const settings = useSettings();

  useEffect(() => {
    const root = document.documentElement;

    // Map fontSize to CSS variables and classes
    const fontSizeMap = {
      sm: { size: "14px", scale: "0.875" }, // 14px base
      md: { size: "16px", scale: "1" }, // 16px base (default)
      lg: { size: "18px", scale: "1.125" }, // 18px base
      xl: { size: "20px", scale: "1.25" }, // 20px base
    };

    const fontConfig = fontSizeMap[settings.fontSize] || fontSizeMap.md;

    // Apply CSS variables for dynamic font sizing
    root.style.setProperty("--font-size-base", fontConfig.size);
    root.style.setProperty("--font-scale", fontConfig.scale);

    // Apply Tailwind-compatible font size class
    const fontSizeClasses = ["text-sm", "text-base", "text-lg", "text-xl"];
    fontSizeClasses.forEach((cls) => root.classList.remove(cls));

    // Apply corresponding class for consistency
    const classMap = {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    };
    root.classList.add(classMap[settings.fontSize] || classMap.md);

    // Also update body for better coverage
    document.body.style.fontSize = fontConfig.size;
  }, [settings.fontSize]);

  return <>{children}</>;
}
