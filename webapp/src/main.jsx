import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

// Sin StrictMode: su doble-render de diagnostico en desarrollo choca con el
// root interno que React Three Fiber crea para el canvas 3D (ver Body3D.jsx),
// disparando un warning de "unmount durante render" que no ocurre en produccion.
createRoot(document.getElementById('root')).render(<App />)
