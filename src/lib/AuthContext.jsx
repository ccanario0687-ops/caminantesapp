import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    setAuthError(null);
    try {
      const basicUser = await Promise.race([
        base44.auth.me(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 3000))
      ]);

      try {
        const matched = await base44.entities.User.filter({ email: basicUser.email });
        let merged = matched?.[0] ? { ...basicUser, ...matched[0] } : basicUser;

        // Multi-tenancy: si el usuario no tiene equipo, intentar reclamar
        // automáticamente el equipo creado al aprobarse su solicitud de acceso.
        if (!merged.equipo_id) {
          try {
            const res = await base44.functions.invoke('gestionUsuarios', { action: 'autoReclamarEquipo' });
            if (res?.data?.reclamado) {
              const matched2 = await base44.entities.User.filter({ email: basicUser.email });
              if (matched2?.[0]) merged = { ...basicUser, ...matched2[0] };
            }
          } catch (_e) { /* sin equipo aprobado aún: flujo normal */ }
        }
        if (!merged.codigo_autorizacion) {
          const localPIN = localStorage.getItem("emaus_codigo_autorizacion");
          if (localPIN) merged.codigo_autorizacion = localPIN;
        }
        setUser(merged);
      } catch {
        setUser(basicUser);
      }
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setUser(null);
      if (error?.data?.extra_data?.reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered' });
      }
    }
  };

  const login = () => {
    base44.auth.redirectToLogin('/');
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout('/');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      login,
      logout,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};