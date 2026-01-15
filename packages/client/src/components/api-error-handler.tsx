/**
 * Global API Error Handler
 * 
 * Listens for custom 'api-error' events dispatched from API calls
 * and displays toast notifications to the user.
 */

import { useEffect } from "react";
import { toast } from "sonner";

interface ApiErrorDetail {
  message: string;
  error?: unknown;
}

export function ApiErrorHandler() {
  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent<ApiErrorDetail>;
      const { message } = customEvent.detail;
      
      // Display error toast with destructive styling
      toast.error(message, {
        duration: 5000,
        description: "Please check your server connection and try again.",
        className: "bg-destructive text-destructive-foreground border-destructive",
        style: {
          // These theme tokens are defined as full color functions (e.g. oklch(...)),
          // so they must be used directly via var().
          backgroundColor: "var(--destructive)",
          color: "var(--destructive-foreground)",
          borderColor: "var(--destructive)",
        },
      });
    };

    // Listen for custom api-error events
    window.addEventListener('api-error', handleApiError);

    return () => {
      window.removeEventListener('api-error', handleApiError);
    };
  }, []);

  return null; // This component doesn't render anything
}
