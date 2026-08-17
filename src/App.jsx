import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ComunidadProvider } from '@/lib/ComunidadContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import InscripcionRemota from "./pages/InscripcionRemota";
import InscripcionCaminante from "./pages/InscripcionCaminante";
import InscripcionServidor from "./pages/InscripcionServidor";
import PublicBoletaDigital from "./pages/PublicBoletaDigital";
import Portada from "./pages/Portada";
import Bienvenida from "./pages/Bienvenida";
import Landing from "./pages/Landing";
import PublicRouteWrapper from "./components/PublicRouteWrapper";
import PageNotFound from './lib/PageNotFound';
import MainLayout from "./components/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

// Private pages - lazy loaded for faster initial load
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const RegistroCaminante = lazyRetry(() => import("./pages/RegistroCaminante"));
const ListaCaminantes = lazyRetry(() => import("./pages/ListaCaminantes"));
const ListaServidores = lazyRetry(() => import("./pages/ListaServidores"));
const Configuracion = lazyRetry(() => import("./pages/Configuracion"));
const Reportes = lazyRetry(() => import("./pages/Reportes"));
const Distribucion = lazyRetry(() => import("./pages/Distribucion"));
const DistintivosHabitacion = lazyRetry(() => import("./pages/DistintivosHabitacion"));
const Impresiones = lazyRetry(() => import("./pages/Impresiones"));
const Ayuda = lazyRetry(() => import("./pages/Ayuda"));
const Finanzas = lazyRetry(() => import("./pages/Finanzas"));
const Suplidores = lazyRetry(() => import("./pages/Suplidores"));
const Programacion = lazyRetry(() => import("./pages/Programacion"));
const Charlistas = lazyRetry(() => import("./pages/Charlistas"));
const Mensajeria = lazyRetry(() => import("./pages/Sacerdotes"));
const Historial = lazyRetry(() => import("./pages/Historial"));
const PanelInscripciones = lazyRetry(() => import("./pages/PanelInscripciones"));
const BibliotecaEmaus = lazyRetry(() => import("./pages/BibliotecaEmaus"));
const GestionUsuarios = lazyRetry(() => import("./pages/GestionUsuarios"));
const EquiposRetiro = lazyRetry(() => import("./pages/EquiposRetiro"));
const CambiarContrasena = lazyRetry(() => import("./pages/CambiarContrasena"));
const ControlEntrada = lazyRetry(() => import("./pages/ControlEntrada"));
const Presupuesto = lazyRetry(() => import("./pages/Presupuesto"));
const ConfigPortada = lazyRetry(() => import("./pages/ConfigPortada"));
const GestionSolicitudes = lazyRetry(() => import("./pages/GestionSolicitudes"));
const SobreNosotros = lazyRetry(() => import("./pages/SobreNosotros"));
const PantallaEnVivo = lazyRetry(() => import("./pages/PantallaEnVivo"));
const EvaluacionRetiro = lazyRetry(() => import("./pages/EvaluacionRetiro"));
const ReporteEvaluaciones = lazyRetry(() => import("./pages/ReporteEvaluaciones"));
const DirectorioServidores = lazyRetry(() => import("./pages/DirectorioServidores"));
const CancioneroEmaus = lazyRetry(() => import("./pages/CancioneroEmaus"));
const BitacoraAuditoria = lazyRetry(() => import("./pages/BitacoraAuditoria"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin"></div>
    </div>
  );
}

// Retry wrapper for lazy imports: if a chunk fails to load (stale hash after a
// rebuild), reload the page so the browser picks up the fresh chunks. Throttled
// to once every 5s so it can recover again on a later rebuild instead of being
// permanently blocked by a stale flag.
function lazyRetry(load) {
  return lazy(() =>
    load().catch((err) => {
      if (err?.message?.includes("Failed to fetch dynamically imported module")) {
        const last = Number(sessionStorage.getItem("chunk_reload_at") || 0);
        if (Date.now() - last > 5000) {
          sessionStorage.setItem("chunk_reload_at", String(Date.now()));
          window.location.reload();
        }
      }
      throw err;
    })
  );
}

const AppContent = () => {
  const { isAuthenticated, authError } = useAuth();

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/landing" element={<PublicRouteWrapper><Landing /></PublicRouteWrapper>} />
        <Route path="/bienvenida" element={<Bienvenida />} />
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 🏘️ RUTAS DE INSCRIPCIÓN PÚBLICAS Y POR COMUNIDAD                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        
        {/* Rutas estándar */}
        <Route path="/inscripcion" element={<InscripcionRemota />} />
        <Route path="/inscripcion/caminante" element={<InscripcionCaminante />} />
        <Route path="/InscripcionCaminante" element={<InscripcionCaminante />} />
        <Route path="/inscripcion/servidor" element={<InscripcionServidor />} />
        <Route path="/InscripcionServidor" element={<InscripcionServidor />} />

        {/* 🎟️ BOLETA DIGITAL Y PASE OFICIAL PÚBLICO CON QR */}
        <Route path="/boleta" element={<PublicBoletaDigital />} />
        <Route path="/boleta/:id" element={<PublicBoletaDigital />} />
        <Route path="/consultar-boleta" element={<PublicBoletaDigital />} />
        <Route path="/cancionero-publico" element={<CancioneroEmaus />} />
        
        {/* 🆕 RUTAS DINÁMICAS CON SLUG DE COMUNIDAD (Ej: /inscripcion/san-jose/caminante) */}
        <Route path="/inscripcion/:comunidadId/caminante" element={<InscripcionCaminante />} />
        <Route path="/inscripcion/:comunidadId/servidor" element={<InscripcionServidor />} />
        <Route path="/inscripcion/:slug" element={<InscripcionRemota />} />

        {/* 🆕 RUTAS PÚBLICAS Y PANTALLAS FULLSCREEN DE RETIRO */}
        <Route path="/evaluacion" element={<EvaluacionRetiro />} />
        <Route path="/evaluacion/:comunidadId" element={<EvaluacionRetiro />} />
        <Route path="/pantalla-envivo" element={<PantallaEnVivo />} />
        <Route path="/pantalla-en-vivo" element={<PantallaEnVivo />} />
        <Route path="/tv" element={<PantallaEnVivo />} />
        <Route path="/bastidores" element={<PantallaEnVivo />} />
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RUTAS PRIVADAS (dentro del layout principal)                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/registro" element={<RegistroCaminante />} />
          <Route path="/caminantes" element={<ListaCaminantes />} />
          <Route path="/servidores" element={<ListaServidores />} />
          <Route path="/directorio-servidores" element={<DirectorioServidores />} />
          <Route path="/cancionero" element={<CancioneroEmaus />} />
          <Route path="/misal" element={<CancioneroEmaus />} />
          <Route path="/evaluaciones-reporte" element={<ReporteEvaluaciones />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/distribucion" element={<Distribucion />} />
          <Route path="/distintivos" element={<DistintivosHabitacion />} />
          <Route path="/impresiones" element={<Impresiones />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/suplidores" element={<Suplidores />} />
          <Route path="/programacion" element={<Programacion />} />
          <Route path="/charlistas" element={<Charlistas />} />
          <Route path="/sacerdotes" element={<Mensajeria />} />
          <Route path="/mensajeria" element={<Mensajeria />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/inscripciones" element={<PanelInscripciones />} />
          <Route path="/hermandad" element={<BibliotecaEmaus />} />
          <Route path="/usuarios" element={<GestionUsuarios />} />
          <Route path="/equipos" element={<EquiposRetiro />} />
          <Route path="/entrada" element={<ControlEntrada />} />
          <Route path="/presupuesto" element={<Presupuesto />} />
          <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />
          <Route path="/config-portada" element={<ConfigPortada />} />
          <Route path="/solicitudes" element={<GestionSolicitudes />} />
          <Route path="/auditoria" element={<BitacoraAuditoria />} />
          <Route path="/bitacora" element={<BitacoraAuditoria />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <ComunidadProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ComunidadProvider>
    </AuthProvider>
  )
}

export default App