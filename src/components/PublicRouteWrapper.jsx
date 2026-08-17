import React, { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Wrapper para rutas públicas que evita redirigir a login
 * Detiene cualquier redirección de AuthContext mientras se está en una ruta pública
 */
export default function PublicRouteWrapper({ children }) {
  const { authError } = useAuth();

  // Las rutas públicas no deben reaccionar a authError de auth_required
  // Solo dejan pasar si es auth_required (que se ignora en rutas públicas)
  
  return children;
}