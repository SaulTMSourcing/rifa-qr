// ============================================================
// frontend/src/components/Marco.jsx
// ------------------------------------------------------------
// El kiosco: encabezado con el logo, barra de avance, area de
// pantallas y el Tiburometro al pie.
//
// Se mantiene fijo mientras las pantallas cambian dentro, para
// que el tiburon no se reinicie en cada transicion: su avance a
// lo largo del cuestionario es parte de la experiencia.
// ============================================================

// Version en negativo: el logo original lleva el texto en el gris
// de marca, que sobre este fondo oscuro queda en 2.45:1 de
// contraste y se pierde. La invertida lo deja en 15.97:1.
// La genera scripts/preparar-assets.mjs.
import logoUrl from '../assets/click-logo-oscuro.webp';
import Tiburometro from './Tiburometro';

function Marco({
  children,
  paso = 0,          // 0 = sin barra; 1..3 = pregunta en curso
  onReiniciar,
  onVerPremios,
  posicionTiburon,
  tiburonActivo,
  nivel,
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-3 sm:p-7">
      <div
        className="con-grano superficie relative flex h-[min(860px,96dvh)] w-full max-w-[430px]
                   flex-col overflow-hidden rounded-[26px] border border-abismo-600
                   shadow-[0_30px_80px_-20px_rgba(0,0,0,.75)]"
      >
        {/* ─── Encabezado ─── */}
        <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-5">
          <img
            src={logoUrl}
            alt="CLICK Seguridad Jurídica"
            className="h-11 w-auto select-none"
            draggable="false"
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/*
              Los premios se pueden consultar en cualquier momento
              del recorrido: es el motivo por el que alguien decide
              contestar, y esconderlo hasta el final desperdicia ese
              gancho. Va en acento porque es la accion opcional que
              si queremos que se toque.
            */}
            {onVerPremios && (
              <button
                type="button"
                onClick={onVerPremios}
                className="flex items-center gap-1.5 rounded-full border border-click-orange/50
                           bg-click-orange/10 px-3 py-1.5 font-mono text-[10px] uppercase
                           tracking-[.05em] text-click-orange transition-colors
                           hover:bg-click-orange/20"
              >
                <span aria-hidden="true">🎁</span>
                Premios
              </button>
            )}

            {onReiniciar && (
              <button
                type="button"
                onClick={onReiniciar}
                className="rounded-full border border-abismo-500 px-2.5 py-1.5
                           font-mono text-[10px] uppercase tracking-[.05em] text-bruma
                           transition-colors hover:border-bruma hover:text-espuma"
              >
                Reiniciar
              </button>
            )}
          </div>
        </header>

        {/* ─── Avance del cuestionario ─── */}
        {paso > 0 && (
          <div className="flex shrink-0 gap-1.5 px-5 pb-3.5" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className="relative h-1 flex-1 overflow-hidden rounded-sm bg-abismo-500">
                <span
                  className="absolute inset-0 origin-left bg-click-orange transition-transform duration-500"
                  style={{ transform: `scaleX(${n <= paso ? 1 : 0})` }}
                />
              </span>
            ))}
          </div>
        )}

        {/* ─── Pantalla activa ─── */}
        <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-1">
          {children}
        </main>

        {/* ─── Tiburometro ─── */}
        <Tiburometro
          posicion={posicionTiburon}
          activo={tiburonActivo}
          nivel={nivel}
        />
      </div>
    </div>
  );
}

export default Marco;
