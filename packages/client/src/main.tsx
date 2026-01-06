import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import RootLayout from "./app/layout";
import { initializeSettingsStore } from "./hooks/use-settings";

// Initialize settings store before rendering
const settingsStore = initializeSettingsStore();
// Load persisted settings from localStorage
settingsStore.getState().load().catch((error) => {
  console.error('Failed to load settings from storage:', error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootLayout>
      <App />
    </RootLayout>
  </React.StrictMode>
);

// Use contextBridge
// @ts-expect-error
window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});
