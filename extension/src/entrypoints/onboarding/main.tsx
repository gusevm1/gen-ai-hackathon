import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/styles/globals.css';
import { initTheme } from '../../lib/theme';
import App from './App';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
