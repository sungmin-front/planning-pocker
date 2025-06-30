import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWithRouter from './AppWithRouter'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithRouter />
  </React.StrictMode>,
)