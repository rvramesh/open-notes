import { ThemeProvider } from "@/components/theme-provider";
import { FontSizeProvider } from "@/components/font-size-provider";
import type React from "react";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <FontSizeProvider>
        {children}
      </FontSizeProvider>
    </ThemeProvider>
  );
}
