// ============================================================
// frontend/src/components/VentanaPremios.jsx
// ------------------------------------------------------------
// Ventana que muestra el poster de los 23 premios sin sacar a la
// persona de la app.
//
// Props:
//   abierta  - si se muestra
//   onCerrar - callback para cerrarla
//
// DECISIONES DE ACCESIBILIDAD
//
// El foco se mueve al boton de cerrar al abrir, y vuelve a donde
// estaba al cerrar: sin eso, quien navega con teclado o lector de
// pantalla se queda perdido detras de la ventana.
//
// El foco queda ATRAPADO dentro mientras esta abierta (Tab cicla
// entre los controles de la ventana). Es lo que distingue un
// dialogo de verdad de un div que solo se ve encima.
//
// Escape cierra, y el fondo tambien. Son los dos gestos que la
// gente intenta por instinto.
//
// Mientras esta abierta se bloquea el scroll del fondo: en movil,
// desplazarse dentro del poster arrastraba tambien la pagina de
// atras y se sentia roto.
// ============================================================

import { useEffect, useRef } from 'react';
import posterPremios from '../assets/premios.webp';

function VentanaPremios({ abierta, onCerrar }) {
  const cajaRef = useRef(null);
  const cerrarRef = useRef(null);
  const focoPrevioRef = useRef(null);

  useEffect(() => {
    if (!abierta) return;

    focoPrevioRef.current = document.activeElement;
    cerrarRef.current?.focus();

    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        onCerrar();
        return;
      }
      if (e.key !== 'Tab') return;

      // Atrapar el foco dentro de la ventana
      const focosables = cajaRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focosables?.length) return;

      const primero = focosables[0];
      const ultimo = focosables[focosables.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alTeclear);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
      // Devolver el foco a donde estaba antes de abrir
      focoPrevioRef.current?.focus?.();
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  return (
    <div
      className="animate-aparecer fixed inset-0 z-50 flex items-center justify-center
                 bg-abismo-900/85 p-3 backdrop-blur-sm"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        ref={cajaRef}
        role="dialog"
        aria-modal="true"
        aria-label="Premios en juego"
        // El clic dentro no debe cerrar: solo el del fondo.
        onClick={(e) => e.stopPropagation()}
        className="animate-subir flex max-h-[92dvh] w-full max-w-[430px] flex-col
                   overflow-hidden rounded-2xl border border-abismo-500 bg-abismo-800
                   shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b
                           border-abismo-600 px-5 py-3.5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-click-orange">
              Sorteo del Tiburómetro
            </p>
            <h2 className="mt-0.5 font-display text-[17px] font-bold leading-tight">
              Lo que puedes ganar
            </h2>
          </div>

          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                       border border-abismo-500 text-lg leading-none text-bruma
                       transition-colors hover:border-click-orange hover:text-click-orange"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <img
            src={posterPremios}
            alt="Premios del Tiburómetro: beca del 100% en el Diplomado Gestión de SOFOMES,
                 beca del 50% en el Diplomado de Administración y Manejo de Fideicomisos, ambas
                 en alianza con la Universidad Anáhuac, y un bono del 100% de descuento sobre
                 honorarios de aceptación en Fideicomiso Sin Escalas."
            className="w-full select-none"
            draggable="false"
          />
        </div>

        <footer className="shrink-0 border-t border-abismo-600 px-5 py-3">
          <button type="button" onClick={onCerrar} className="boton">
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
}

export default VentanaPremios;
