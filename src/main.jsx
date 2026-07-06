import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './store/AuthContext'
import { HospitalProvider } from './store/HospitalContext'
import { ToastProvider } from './components/ui/Toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
