// ============================================================
// frontend/src/components/Tiburometro.jsx
// ------------------------------------------------------------
// La escala y el oceano que viven al pie de la pantalla.
//
// Props:
//   posicion  - porcentaje (0-100) donde se detiene el tiburon
//   activo    - false antes de la primera respuesta: el medidor
//               se ve apagado, sin tramo encendido
//   nivel     - clave del nivel (safe|turbias|abiertas|sharks)
//               para colorear el tramo correspondiente
//
// El tiburon nada de izquierda a derecha hacia el objetivo, que
// es el punto de maxima exposicion. Cuanto peor el diagnostico,
// mas cerca queda de la presa.
// ============================================================

import tiburonUrl from '../assets/tiburon.webp';

// Los cuatro tramos de la escala, de menor a mayor exposicion.
const TRAMOS = [
  { clave: 'safe', color: 'bg-zona-safe' },
  { clave: 'turbias', color: 'bg-zona-turbias' },
  { clave: 'abiertas', color: 'bg-zona-abiertas' },
  { clave: 'sharks', color: 'bg-zona-sharks' },
];

function Tiburometro({ posicion = 6, activo = false, nivel = null }) {
  // Se acota para que el tiburon nunca se salga de la pista ni se
  // encime con el objetivo del extremo derecho.
  const izquierda = Math.max(4, Math.min(86, posicion));

  // Que tramo se enciende. Si ya hay un nivel resuelto manda ese;
  // si no, se deduce de la posicion mientras la persona responde.
  const indiceEncendido = nivel
    ? TRAMOS.findIndex((t) => t.clave === nivel)
    : Math.min(3, Math.floor(izquierda / 24));

  return (
    <div className="relative flex flex-col overflow-hidden border-t border-abismo-600
                    bg-gradient-to-b from-abismo-600 to-abismo-900">

      {/* ─── Escala graduada ─── */}
      <div className="flex items-center gap-2.5 px-4 pt-3" aria-hidden="true">
        <span className="w-3 shrink-0 text-center font-mono text-base font-semibold leading-none text-bruma">
          −
        </span>

        <div className="flex h-1.5 flex-1 gap-[3px]">
          {TRAMOS.map((tramo, i) => {
            const encendido = activo && i === indiceEncendido;
            return (
              <i
                key={tramo.clave}
                className={[
                  'flex-1 rounded-sm transition-all duration-500',
                  tramo.color,
                  encendido ? 'opacity-100 scale-y-150' : 'opacity-25',
                ].join(' ')}
              />
            );
          })}
        </div>

        <span className="w-3 shrink-0 text-center font-mono text-base font-semibold leading-none text-bruma">
          +
        </span>
      </div>

      <p className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-[.16em] text-bruma2">
        Tiburómetro · nivel de exposición
      </p>

      {/* ─── Agua ─── */}
      <div className="agua relative h-[104px] overflow-hidden">

        {/* Corriente: barrido lento de luz para que el agua respire */}
        <div className="corriente animate-corriente" aria-hidden="true" />

        {/* Objetivo: el punto de maxima exposicion */}
        <div
          className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center
                     justify-center rounded-full border-[1.5px] border-click-orange"
          aria-hidden="true"
        >
          <span className="block h-2 w-2 rounded-full bg-click-orange" />
          <span className="absolute -inset-2 animate-sonar rounded-full border border-click-orange/35" />
        </div>

        {/* Tiburon */}
        <div
          className="tiburon absolute top-1/2 w-[120px] -translate-y-1/2"
          style={{ left: `${izquierda}%` }}
        >
          <img
            src={tiburonUrl}
            alt=""
            aria-hidden="true"
            className="w-full animate-nadar select-none"
            draggable="false"
          />
        </div>

        <div className="greca absolute inset-x-0 bottom-0 h-2.5 opacity-50" aria-hidden="true" />
      </div>
    </div>
  );
}

export default Tiburometro;
