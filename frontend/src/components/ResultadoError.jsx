// ============================================================
// frontend/src/components/ResultadoError.jsx
// ------------------------------------------------------------
// Pantalla de error mostrada cuando el registro falla.
//
// Props:
//   tipo            - 'red' | 'correo_duplicado' | 'rate_limit' | 'generico'
//   mensaje         - texto del error (viene del backend o del cliente)
//   onReintentar    - callback para reintentar el mismo envio
//   onEditar        - callback para volver al formulario
//
// Para cada tipo de error mostramos accion principal distinta:
//   - red:               "Reintentar" como accion principal
//   - correo_duplicado:  "Editar datos" como accion principal
//   - rate_limit:        Solo "Editar datos" (no podemos reintentar)
//   - generico:          "Reintentar" como accion principal
// ============================================================

import { WifiOff, MailX, Clock, AlertCircle, RotateCcw, Pencil } from 'lucide-react';

function ResultadoError({ tipo, mensaje, onReintentar, onEditar }) {
  // ----------------------------------------------------------
  // Configuracion visual por tipo de error
  // ----------------------------------------------------------
  const configuracion = {
    red: {
      Icon: WifiOff,
      titulo: 'Sin conexión',
      colorIcon: 'text-danger',
      colorBg: 'bg-red-50',
      mostrarReintentar: true,
      mostrarEditar: false,
    },
    correo_duplicado: {
      Icon: MailX,
      titulo: 'Correo ya registrado',
      colorIcon: 'text-click-orange',
      colorBg: 'bg-click-orange-light',
      mostrarReintentar: false,
      mostrarEditar: true,
    },
    rate_limit: {
      Icon: Clock,
      titulo: 'Demasiados intentos',
      colorIcon: 'text-click-orange',
      colorBg: 'bg-click-orange-light',
      mostrarReintentar: false,
      mostrarEditar: true,
    },
    generico: {
      Icon: AlertCircle,
      titulo: 'Ocurrió un error',
      colorIcon: 'text-danger',
      colorBg: 'bg-red-50',
      mostrarReintentar: true,
      mostrarEditar: true,
    },
  };

  const cfg = configuracion[tipo] || configuracion.generico;
  const { Icon } = cfg;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Icono y titulo */}
      <div className="text-center">
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${cfg.colorBg} mb-4`}
        >
          <Icon size={40} className={cfg.colorIcon} strokeWidth={2} />
        </div>

        <h2 className="text-2xl font-black text-ink mb-2">{cfg.titulo}</h2>

        <p className="text-click-gray leading-relaxed">{mensaje}</p>
      </div>

      {/* Acciones */}
      <div className="space-y-3">
        {cfg.mostrarReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="
              w-full
              flex items-center justify-center gap-2
              bg-click-orange hover:bg-click-orange-dark
              text-white font-bold text-lg
              rounded-lg
              py-4
              transition-colors
              shadow-md
            "
          >
            <RotateCcw size={20} strokeWidth={2.5} />
            Reintentar
          </button>
        )}

        {cfg.mostrarEditar && (
          <button
            type="button"
            onClick={onEditar}
            className={`
              w-full
              flex items-center justify-center gap-2
              ${cfg.mostrarReintentar
                ? 'bg-white hover:bg-click-gray-light text-click-gray border-2 border-gray-200'
                : 'bg-click-orange hover:bg-click-orange-dark text-white shadow-md'
              }
              font-semibold
              rounded-lg
              py-3
              transition-colors
            `}
          >
            <Pencil size={16} strokeWidth={2.5} />
            Editar datos
          </button>
        )}
      </div>
    </div>
  );
}

export default ResultadoError;
