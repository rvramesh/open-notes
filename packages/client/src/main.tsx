import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import RootLayout from './app/layout'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootLayout>
      <App />
    </RootLayout>
  </React.StrictMode>,
)


// Use contextBridge
// @ts-expect-error
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})

