import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// Capacitor (native) ortamında file:// protokolü kullanıldığından HashRouter gerekli
// Web ortamında BrowserRouter yeterli
const isNative = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
const Router = isNative ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
)
