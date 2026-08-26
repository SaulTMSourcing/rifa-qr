// ============================================================
// frontend/src/components/PantallaResultado.jsx
// ------------------------------------------------------------
// Cierre del flujo: confirma el registro y revela si gano.
//
// Props:
//   resultado - { numeroRegistro, esGanador, premio, nombreCompleto,
//                 nivel, puntaje }
//   onNoSoyYo - limpia el registro guardado en este dispositivo
//
// El numero de registro se muestra grande y en mono: es el numero
// de rifa, la persona lo va a leer en voz alta en el stand para
// reclamar su premio, asi que tiene que leerse de un vistazo y sin
// ambiguedad entre digitos.
//
// El diagnostico tambien aparece aqui. Como el envio por correo
// quedo fuera de alcance, esta pantalla es lo unico que le queda a
// la persona de su resultado del Tiburometro, y sobrevive al
// recargar porque viene de localStorage.
// ============================================================

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { nivelPorClave } from '../tiburometro';

// Tailwind necesita las clases escritas completas: no puede
// analizar nombres armados concatenando cadenas.
const PUNTO_NIVEL = {
  safe: 'bg-zona-safe',
  turbias: 'bg-zona-turbias',
  abiertas: 'bg-zona-abiertas',
  sharks: 'bg-zona-sharks',
};
const TEXTO_NIVEL = {
  safe: 'text-zona-safe',
  turbias: 'text-zona-turbias',
  abiertas: 'text-zona-abiertas',
  sharks: 'text-zona-sharks',
};

function PantallaResultado({ resultado, onNoSoyYo }) {
  const { numeroRegistro, esGanador, premio, nombreCompleto } = resultado;

  // Un registro guardado por una version anterior no trae nivel:
  // en ese caso simplemente no se pinta el bloque.
  const diagnostico = resultado.nivel ? nivelPorClave(resultado.nivel) : null;

  const yaLanzado = useRef(false);

  // ----------------------------------------------------------
  // Confeti solo para ganadores, y una sola vez.
  // ----------------------------------------------------------
  // El ref evita que se repita si React vuelve a montar el efecto
  // (en desarrollo, StrictMode monta dos veces a proposito).
  //
  // Se respeta prefers-reduced-motion: hay gente a la que el
  // movimiento brusco le provoca mareo, y esto dispara particulas
  // por toda la pantalla.
  // ----------------------------------------------------------
  useEffect(() => {
    if (!esGanador || yaLanzado.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    yaLanzado.current = true;
    const colores = ['#f56f04', '#ff8c34', '#f5f3ee'];

    confetti({ particleCount: 70, spread: 65, origin: { y: 0.35 }, colors: colores });
    const t = setTimeout(
      () => confetti({ particleCount: 45, spread: 90, origin: { y: 0.4 }, colors: colores }),
      260
    );
    return () => clearTimeout(t);
  }, [esGanador]);

  return (
    <div className="flex h-full flex-col items-center pt-6 text-center">
      {/* Marca de estado */}
      <div
        className={[
          'animate-entrar flex h-14 w-14 items-center justify-center rounded-full text-2xl',
          esGanador ? 'bg-click-orange text-abismo-900 animate-pulso' : 'bg-zona-safe text-abismo-900',
        ].join(' ')}
        aria-hidden="true"
      >
        {esGanador ? '★' : '✓'}
      </div>

      <h1
        className="animate-entrar mt-5 font-display text-[25px] font-bold leading-[1.15]"
        style={{ animationDelay: '90ms' }}
      >
        {esGanador ? '¡Ganaste un premio!' : '¡Listo, ya estás participando!'}
      </h1>

      {/* Numero de rifa */}
      <div
        className="animate-entrar mt-5 w-full rounded-2xl border border-abismo-500 bg-abismo-600 px-4 py-5"
        style={{ animationDelay: '170ms' }}
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-bruma">
          Tu número de registro
        </p>
        <p className="mt-1.5 font-mono text-[44px] font-semibold leading-none text-click-orange">
          {numeroRegistro}
        </p>
        {nombreCompleto && (
          <p className="mt-2.5 text-[13px] text-bruma">{nombreCompleto}</p>
        )}
      </div>

      {/* Premio */}
      {esGanador && premio && (
        <div
          className="animate-entrar mt-3.5 w-full rounded-2xl border border-click-orange/40 bg-click-orange/10 px-4 py-4"
          style={{ animationDelay: '250ms' }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-click-orange">
            Tu premio
          </p>
          <p className="mt-1.5 font-display text-[19px] font-bold leading-snug text-espuma">
            {premio}
          </p>
        </div>
      )}

      {/* Diagnóstico del Tiburómetro */}
      {diagnostico && (
        <div
          className="animate-entrar mt-3.5 w-full rounded-2xl border border-abismo-500
                     bg-abismo-600 px-4 py-3.5 text-left"
          style={{ animationDelay: '300ms' }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-bruma">
            Tu diagnóstico
          </p>

          <div className="mt-2 flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${PUNTO_NIVEL[diagnostico.clave]}`}
              aria-hidden="true"
            />
            <span
              className={`font-display text-[17px] font-bold leading-tight ${TEXTO_NIVEL[diagnostico.clave]}`}
            >
              {diagnostico.nombre}
            </span>
            {typeof resultado.puntaje === 'number' && (
              <span className="ml-auto shrink-0 font-mono text-[12px] text-bruma2">
                {resultado.puntaje} pts
              </span>
            )}
          </div>

          <p className="mt-2 text-[12.5px] leading-[1.5] text-bruma">
            {diagnostico.mensaje}
          </p>
        </div>
      )}

      <p
        className="animate-entrar mt-4 text-[13px] leading-[1.55] text-bruma"
        style={{ animationDelay: '380ms' }}
      >
        {esGanador
          ? 'Pasa al stand 25 el viernes 28 de agosto, al terminar la última ponencia, para recoger tu premio. Muestra este número.'
          : 'Te esperamos el viernes 28 de agosto en el stand 25, al terminar la última ponencia, para la entrega de regalos.'}
      </p>

      {onNoSoyYo && (
        <button
          type="button"
          onClick={onNoSoyYo}
          className="mt-auto pt-4 text-[12px] text-bruma2 underline underline-offset-2
                     transition-colors hover:text-bruma"
        >
          No soy yo, registrar a otra persona
        </button>
      )}
    </div>
  );
}

export default PantallaResultado;
