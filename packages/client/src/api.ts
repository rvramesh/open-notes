let API_BASE_URL = "/api";
let isInitialized = false;

// Initialize API URL asynchronously
async function initializeApiUrl() {
  try {
    //@ts-expect-error declare global ipcRenderer
    if (window.ipcRenderer?.getServerUrl) {
      //@ts-expect-error declare global ipcRenderer
      const serverUrl = await window.ipcRenderer.getServerUrl();
      // Normalize: if we get a full URL like http://127.0.0.1:3000, append /api
      API_BASE_URL = serverUrl.startsWith('http') ? `${serverUrl}/api` : serverUrl;
      console.log("API initialized with URL:", API_BASE_URL);
    }
  } catch (error) {
    console.warn("Failed to get server URL from IPC, using default:", error);
    API_BASE_URL = "/api";
  } finally {
    isInitialized = true;
  }
}

// Initialize on module load and export the promise
const initPromise = initializeApiUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Ensure API is initialized before making calls
 */
export async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initPromise;
  }
}

export async function checkHealth(): Promise<{ status: string }> {
  // Wait for initialization before making the request
  await ensureInitialized();
  
  console.log("Checking health at:", `${API_BASE_URL}/health`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      const message = `Health check failed: ${response.status} ${response.statusText}`;
      // Dispatch error event for toast notification
      window.dispatchEvent(new CustomEvent('api-error', { 
        detail: { message } 
      }));
      throw new Error(message);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      const message = "Cannot connect to server. Please ensure the server is running.";
      window.dispatchEvent(new CustomEvent('api-error', { 
        detail: { message } 
      }));
      throw new Error(message);
    }
    throw error;
  }
}
