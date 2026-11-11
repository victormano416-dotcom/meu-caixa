import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthCloudGate from './AuthCloudGate.jsx'
import './index.css'
import { registrarServiceWorker, iniciarCapturaCompartilhamento } from './shareQueue.js'

registrarServiceWorker()
iniciarCapturaCompartilhamento()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthCloudGate>
      <App />
    </AuthCloudGate>
  </React.StrictMode>,
)
