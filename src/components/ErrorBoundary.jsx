import React from "react";

/**
 * ErrorBoundary global: evita que la app quede en pantalla negra
 * cuando un error de render o de carga de un chunk ocurre (frecuente en móvil).
 * Muestra una pantalla recuperable con botón "Reintentar".
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary capturó:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ? String(this.state.error.message).slice(0, 300) : "";
      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-amber-100 p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-3xl text-amber-700">✝</span>
            </div>
            <h1 className="text-lg font-bold text-amber-900 mb-2">No se pudo cargar la aplicación</h1>
            <p className="text-sm text-gray-600 mb-4">
              Ocurrió un problema al abrir. Revisa tu conexión a internet e inténtalo de nuevo.
            </p>
            {msg && (
              <pre className="text-xs text-left bg-gray-50 border border-gray-200 rounded-lg p-2 mb-4 overflow-auto max-h-32 text-red-600 whitespace-pre-wrap break-words">
                {msg}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}