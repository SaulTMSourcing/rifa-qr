// ============================================================
// frontend/src/components/ResultadoParticipante.jsx
// ------------------------------------------------------------
// Pantalla mostrada cuando el participante NO es ganador.
//
// Filosofia de diseno: agradecer sinceramente, sin promesas
// vacias ni mensajes condescendientes tipo "ojala la proxima".
//
// Props:
//   numeroRegistro  - numero asignado (entero)
//   nombreCompleto  - "Nombre Apellido_pat Apellido_mat"
//   onNoSoyYo       - callback para limpiar localStorage y volver
// ============================================================

import { CheckCircle2, Heart } from 'lucide-react';

function ResultadoParticipante({ numeroRegistro, nombreCompleto, onNoSoyYo }) {
  return (
    <div className="space-y-6 animate-bounce-in">
      {/* =================================================== */}
      {/* Icono y mensaje principal                           */}
      {/* =================================================== */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-click-orange-light mb-4">
          <CheckCircle2 size={48} className="text-click-orange" strokeWidth={2} />
        </div>

        <h2 className="text-3xl font-black text-ink mb-1">
          ¡Registro exitoso!
        </h2>
        <p className="text-click-gray font-medium flex items-center justify-center gap-1.5">
          <Heart size={16} className="text-click-orange fill-click-orange" />
          Gracias por participar
        </p>
      </div>

      {/* =================================================== */}
      {/* Numero de registro                                  */}
      {/* =================================================== */}
      <div className="bg-click-gray text-white rounded-xl p-6 text-center shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">
          Tu número de registro
        </p>
        <p className="text-6xl font-black tracking-tight">
          #{numeroRegistro}
        </p>
      </div>

      {/* =================================================== */}
      {/* Mensaje institucional                               */}
      {/* =================================================== */}
      <div className="bg-click-orange-light rounded-xl p-5 text-center">
        <p className="text-sm text-ink leading-relaxed">
          Tu participación en la <strong>Convención Nacional ASOFOM</strong>
          {' '}quedó registrada.
        </p>
        <p className="text-sm text-click-gray mt-2">
          De parte de <strong className="text-click-orange-dark">CLICK Seguridad Jurídica</strong>,
          {' '}te agradecemos por estar aquí.
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

export default ResultadoParticipante;
