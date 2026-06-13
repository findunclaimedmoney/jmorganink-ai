import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { StudioProvider } from './studio/StudioContext'; // Import this

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StudioProvider>
      <App />
    </StudioProvider>
  </React.StrictMode>
);