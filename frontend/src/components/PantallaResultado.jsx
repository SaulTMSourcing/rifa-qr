// ============================================================
// frontend/src/components/PantallaResultado.jsx
// ------------------------------------------------------------
// Cierre del flujo: confirma el registro y entrega el numero.
//
// Props:
//   resultado - { numeroRegistro, nombreCompleto, nivel, puntaje }
//
// AQUI NO SE DICE SI GANO.
//
// El sorteo se hace el viernes, despues de cerrar los registros y
// sobre la lista real de participantes. En el momento del registro
// todavia no hay ganadores que anunciar: lo unico cierto es el
// numero que le toco.
//
// Ese numero se muestra grande y en mono porque es lo unico que
// conecta a la persona con un posible premio, y lo va a leer en voz
// alta en un stand con ruido: tiene que distinguirse sin
// ambiguedad entre digitos.
//
// No hay forma de borrar el registro desde aqui. Para registrar a
// otra persona en el mismo dispositivo esta el boton Reiniciar del
// encabezado, que reinicia el recorrido sin tirar lo guardado.
// ============================================================

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

function PantallaResultado({ resultado }) {
  const { numeroRegistro, nombreCompleto } = resultado;

  // Un registro guardado por una version anterior no trae nivel:
  // en ese caso simplemente no se pinta el bloque.
  const diagnostico = resultado.nivel ? nivelPorClave(resultado.nivel) : null;

  return (
    <div className="flex h-full flex-col items-center pt-6 text-center">
      <div
        className="animate-entrar flex h-14 w-14 items-center justify-center rounded-full
                   bg-zona-safe text-2xl text-abismo-900"
        aria-hidden="true"
      >
        ✓
      </div>

      <h1
        className="animate-entrar mt-5 font-display text-[25px] font-bold leading-[1.15]"
        style={{ animationDelay: '90ms' }}
      >
        ¡Listo, ya estás participando!
      </h1>

      {/* Numero de rifa */}
      <div
        className="animate-entrar mt-5 w-full rounded-2xl border border-abismo-500 bg-abismo-600 px-4 py-5"
        style={{ animationDelay: '170ms' }}
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-bruma">
          Tu número de registro
        </p>
        <p className="mt-1.5 font-mono text-[46px] font-semibold leading-none text-click-orange">
          {numeroRegistro}
        </p>
        {nombreCompleto && (
          <p className="mt-2.5 text-[13px] text-bruma">{nombreCompleto}</p>
        )}
      </div>

      {/*
        Recordatorio de la captura.
        ---------------------------------------------------------
        No es un adorno: como los ganadores se anuncian hasta el
        viernes, este numero es lo unico que conecta a la persona
        con su premio, y para entonces la pestana puede estar
        cerrada o el telefono en otras manos. Va en acento y con
        borde para que se lea antes que el texto de abajo.
      */}
      <div
        className="animate-entrar mt-3 flex w-full items-start gap-2.5 rounded-xl
                   border border-click-orange/40 bg-click-orange/10 px-3.5 py-3 text-left"
        style={{ animationDelay: '240ms' }}
      >
        <span className="mt-px shrink-0 text-[15px]" aria-hidden="true">📸</span>
        <p className="text-[12.5px] leading-[1.45] text-espuma">
          <strong className="font-semibold">Toma una captura de pantalla.</strong>{' '}
          Vas a necesitar este número el viernes para reclamar tu premio.
        </p>
      </div>

      {/* Diagnóstico del Tiburómetro */}
      {diagnostico && (
        <div
          className="animate-entrar mt-3 w-full rounded-2xl border border-abismo-500
                     bg-abismo-600 px-4 py-3.5 text-left"
          style={{ animationDelay: '310ms' }}
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
        className="animate-entrar mt-4 pb-2 text-[13px] leading-[1.55] text-bruma"
        style={{ animationDelay: '380ms' }}
      >
        Los ganadores se anuncian el <strong className="text-espuma">viernes 28 de agosto
        en el stand 25</strong>, al terminar la última ponencia.
      </p>
    </div>
  );
}

export default PantallaResultado;
