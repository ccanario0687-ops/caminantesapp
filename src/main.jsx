import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

import { inicializarEntidadesBase44 } from '@/lib/base44InitEntities';

// Crear e inicializar automáticamente las entidades 'EquiposRetiro' y 'ConfigRetiro' en Base44
inicializarEntidadesBase44();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Eliminar cualquier Service Worker previo (causaba builds obsoletos en caché).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => console.log("Service Workers eliminados"))
      .catch(() => {});
  });
}