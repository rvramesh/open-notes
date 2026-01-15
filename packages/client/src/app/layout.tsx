import { ThemeProvider } from "@/components/theme-provider";
import { FontSizeProvider } from "@/components/font-size-provider";
import { Toaster } from "@/components/ui/sonner";
import { ApiErrorHandler } from "@/components/api-error-handler";
import type React from "react";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <FontSizeProvider>
        {children}
        <Toaster />
        <ApiErrorHandler />
      </FontSizeProvider>
    </ThemeProvider>
  );
}
