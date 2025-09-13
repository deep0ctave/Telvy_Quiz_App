import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css';

// Set document title on load
document.title = 'Schoolmela';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App>
    </App>
  </StrictMode>,
)
