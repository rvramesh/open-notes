import { Suspense, useEffect, useState } from "react";
import { checkHealth } from "./api";
import "./app/globals.css";
import { NotesWorkspace } from "./components/notes-workspace";

function HealthStatus() {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth()
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Checking health...</p>;
  if (error) return <p style={{ color: "red" }}>Health check failed: {error}</p>;
  return <NotesWorkspace />;
}

function App() {
  const [count, setCount] = useState(0);

  // Listen for API errors and dispatch toast events
  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail?.message || "An error occurred";
      
      // Dispatch toast event
      const toastEvent = new CustomEvent('show-toast', {
        detail: {
          message,
          type: 'error',
          timestamp: customEvent.detail?.timestamp || new Date().toISOString(),
        },
      });
      window.dispatchEvent(toastEvent);
    };

    window.addEventListener('api-error', handleApiError);
    return () => {
      window.removeEventListener('api-error', handleApiError);
    };
  }, []);

  return (
    <>
      <Suspense fallback={<p>Loading health status...</p>}>
        <HealthStatus />
      </Suspense>
    </>
  );
}

export default App;
