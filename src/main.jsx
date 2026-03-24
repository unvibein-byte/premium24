import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'

const WEB_GOOGLE_CLIENT_ID = '999558251004-og9rn5p3ojthq0a9cgbac9ef20grg3sb.apps.googleusercontent.com'
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim() || WEB_GOOGLE_CLIENT_ID

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>,
)
