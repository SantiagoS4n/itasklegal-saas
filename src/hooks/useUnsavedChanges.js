import { useEffect } from 'react';

/**
 * Advierte al usuario antes de salir si hay cambios sin guardar.
 * @param {boolean} hasUnsaved - true si hay cambios pendientes
 */
export function useUnsavedChanges(hasUnsaved) {
  useEffect(() => {
    if (!hasUnsaved) return;

    // Advertencia al cerrar/recargar la pestaña
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // requerido por algunos navegadores
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved]);
}
