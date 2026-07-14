import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import firebaseConfig from '../firebase-applet-config.json';

const clientId = localStorage.getItem('VITE_GOOGLE_CLIENT_ID') || 
                 import.meta.env.VITE_GOOGLE_CLIENT_ID || 
                 firebaseConfig.oAuthClientId || 
                 'dummy-client-id';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
