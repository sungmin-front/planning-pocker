import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWithRouter from './AppWithRouter'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithRouter />
  </React.StrictMode>,
)