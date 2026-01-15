let API_BASE_URL = "/api";

// Initialize API URL asynchronously
async function initializeApiUrl() {
  try {
    //@ts-expect-error declare global ipcRenderer
    if (window.ipcRenderer?.getServerUrl) {
      //@ts-expect-error declare global ipcRenderer
      API_BASE_URL = await window.ipcRenderer.getServerUrl();
    }
  } catch (error) {
    console.warn("Failed to get server URL from IPC, using default:", error);
    API_BASE_URL = "/api";
  }
}

// Initialize on module load
initializeApiUrl().catch(console.error);

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function checkHealth(): Promise<{ status: string }> {
  console.log("API_BASE_URL:", API_BASE_URL);
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}
