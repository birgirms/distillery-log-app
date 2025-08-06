import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18+
import './index.css'; // <--- ADD THIS LINE
import App from './App'; // Import your main App component

// Get the root DOM element where your React app will be mounted
const rootElement = document.getElementById('root');

// Create a root and render your App component within React's StrictMode
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);