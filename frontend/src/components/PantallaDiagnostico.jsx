// ============================================================
// frontend/src/components/PantallaDiagnostico.jsx
// ------------------------------------------------------------
// El resultado del Tiburometro, antes de pedir los datos.
//
// Es el momento de mayor carga emocional del flujo: la persona
// acaba de descubrir que tan expuesta esta. La comparacion entre
// "tu tiempo actual" y "con fideicomiso" es el argumento
// comercial completo, y por eso va en su propia tarjeta.
//
// Props:
//   nivel        - objeto del catalogo (nombre, titular, mensaje)
//   tuTiempo     - etiqueta de lo que respondio en la pregunta 3
//   onContinuar  - avanza al formulario
// ============================================================

// Color del distintivo segun el nivel. Se resuelven a clases
// completas porque Tailwind no puede analizar clases armadas
// concatenando cadenas.
const COLOR_NIVEL = {
  safe: 'text-zona-safe',
  turbias: 'text-zona-turbias',
  abiertas: 'text-zona-abiertas',
  sharks: 'text-zona-sharks',
};

function PantallaDiagnostico({ nivel, tuTiempo, onContinuar }) {
  return (
    <div className="flex h-full flex-col pt-2">
      {/* Distintivo del nivel */}
      <div
        className={[
          'animate-entrar inline-flex w-fit items-center gap-2 rounded-full',
          'border border-current/25 px-3 py-1.5',
          'font-mono text-[11px] font-semibold uppercase tracking-[.04em]',
          COLOR_NIVEL[nivel.clave],
        ].join(' ')}
        style={{ animationDelay: '60ms' }}
      >
        <span className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden="true" />
        {nivel.nombre}
      </div>

      <h1
        className="animate-entrar mt-4 font-display text-[23px] font-bold leading-[1.18] tracking-[-.01em]"
        style={{ animationDelay: '140ms' }}
      >
        {nivel.titular}
      </h1>

      <p
        className="animate-entrar mt-3 text-[14px] leading-[1.55] text-bruma"
        style={{ animationDelay: '220ms' }}
      >
        {nivel.mensaje}
      </p>

      {/* Comparacion: el argumento comercial */}
      <div
        className="animate-entrar mt-5 rounded-2xl border border-abismo-500 bg-abismo-600 p-4"
        style={{ animationDelay: '300ms' }}
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[10.5px] uppercase tracking-[.04em] text-bruma">
              Tu tiempo actual
            </p>
            <p className="mt-1 font-mono text-[15px] font-semibold leading-tight text-espuma">
              {tuTiempo}
            </p>
          </div>

          <div className="w-px bg-abismo-500" aria-hidden="true" />

          <div className="flex-1">
            <p className="text-[10.5px] uppercase tracking-[.04em] text-bruma">
              Con Fideicomiso
            </p>
            <p className="mt-1 font-mono text-[15px] font-semibold leading-tight text-click-orange">
              120 días o menos*
            </p>
          </div>
        </div>

        <p className="mt-3 text-[10.5px] leading-snug text-bruma2">
          *Pregunta por tus alternativas.
        </p>
      </div>

      <button
        type="button"
        onClick={onContinuar}
        className="boton animate-entrar mt-auto"
        style={{ animationDelay: '380ms' }}
      >
        Quiero mi diagnóstico
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

export default PantallaDiagnostico;
