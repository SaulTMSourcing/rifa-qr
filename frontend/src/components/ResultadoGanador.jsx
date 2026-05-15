// ============================================================
// frontend/src/components/ResultadoGanador.jsx
// ------------------------------------------------------------
// Pantalla mostrada cuando el participante es ganador.
//
// Props:
//   numeroRegistro  - numero asignado (entero)
//   nombreCompleto  - "Nombre Apellido_pat Apellido_mat"
//   premio          - texto descriptivo del premio
//   onNoSoyYo       - callback para limpiar localStorage y volver al form
//                     (uso legitimo: celular compartido)
//
// Efectos:
//   - Dispara confeti al montar (3 rafagas con timing)
// ============================================================

import { useEffect } from 'react';
import { Trophy, Gift, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

function ResultadoGanador({ numeroRegistro, nombreCompleto, premio, onNoSoyYo }) {
  // ----------------------------------------------------------
  // Confeti al montar
  // ----------------------------------------------------------
  // Tres rafagas escalonadas: izquierda, derecha, centro.
  // Colores: naranja CLICK + dorado, para mantener identidad.
  // ----------------------------------------------------------
  useEffect(() => {
    const colores = ['#ff6b00', '#fbbf24', '#fff4eb', '#d97706'];

    const disparar = (origenX) => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: origenX, y: 0.6 },
        colors: colores,
      });
    };

    // Rafaga 1: izquierda inmediata
    disparar(0.2);
    // Rafaga 2: derecha 200ms despues
    const t1 = setTimeout(() => disparar(0.8), 200);
    // Rafaga 3: centro 500ms despues, mas grande
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: colores,
        ticks: 300,
      });
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="space-y-6 animate-bounce-in">
      {/* =================================================== */}
      {/* Trofeo y mensaje principal                          */}
      {/* =================================================== */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-winner-light mb-4 animate-pulse-orange">
          <Trophy size={48} className="text-winner-dark" strokeWidth={2} />
        </div>

        <h2 className="text-3xl font-black text-ink mb-1">
          ¡Felicidades!
        </h2>
        <p className="text-click-gray font-medium flex items-center justify-center gap-1.5">
          <Sparkles size={16} className="text-winner-dark" />
          Has ganado un premio
          <Sparkles size={16} className="text-winner-dark" />
        </p>
      </div>

      {/* =================================================== */}
      {/* Numero de registro                                  */}
      {/* =================================================== */}
      <div className="bg-click-orange text-white rounded-xl p-6 text-center shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">
          Tu número de registro
        </p>
        <p className="text-6xl font-black tracking-tight">
          #{numeroRegistro}
        </p>
      </div>

      {/* =================================================== */}
      {/* Tarjeta del premio                                  */}
      {/* =================================================== */}
      <div className="bg-winner-light border-2 border-winner rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-winner flex items-center justify-center">
            <Gift size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-winner-dark mb-1">
              Tu premio
            </p>
            <p className="text-lg font-bold text-ink">{premio}</p>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* Instrucciones para reclamar                         */}
      {/* =================================================== */}
      <div className="bg-click-gray-light rounded-xl p-5 text-sm text-click-gray">
        <p className="font-semibold text-ink mb-2">
          ¿Cómo reclamar tu premio?
        </p>
        <p>
          Acércate al stand de <strong>CLICK Seguridad Jurídica</strong>
          {' '}y muestra esta pantalla con tu número de registro.
        </p>
      </div>

      {/* =================================================== */}
      {/* Recibo digital                                      */}
      {/* =================================================== */}
      <div className="border-t border-gray-200 pt-4 text-center">
        <p className="text-xs text-click-gray mb-1">Registrado a nombre de</p>
        <p className="font-semibold text-ink">{nombreCompleto}</p>
      </div>

      {/* =================================================== */}
      {/* Boton discreto: no soy yo                           */}
      {/* =================================================== */}
      <button
        type="button"
        onClick={onNoSoyYo}
        className="
          w-full
          text-sm text-click-gray
          hover:text-click-orange
          underline
          py-2
          transition-colors
        "
      >
        ¿No eres tú? Borrar datos y registrar a otra persona
      </button>
    </div>
  );
}

export default ResultadoGanador;
