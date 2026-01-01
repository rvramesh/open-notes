const API_BASE_URL = //@ts-expect-error declare global ipcRenderer
  window.ipcRenderer?.getServerUrl ? await window.ipcRenderer.getServerUrl() : "/api";

export async function checkHealth(): Promise<{ status: string }> {
  console.log("API_BASE_URL:", API_BASE_URL);
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}
