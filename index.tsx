
import React from 'react';
import ReactDOM from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App';

// Initialize PostHog
posthog.init('phc_rI5oO1NfNsKq7Hy6IzlCDeFYyIQmS0rIs83MZKBKMeG', {
  api_host: 'https://us.posthog.com',
  loaded: (ph) => {
    if (import.meta.env.DEV) ph.opt_out_capturing();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
