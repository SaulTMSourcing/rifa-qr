// ============================================================
// frontend/src/components/ResumenDatos.jsx
// ------------------------------------------------------------
// Pantalla de confirmacion previa al envio al backend.
// Muestra los datos capturados y permite editar o confirmar.
//
// Props:
//   datos           - objeto con los 7 campos del formulario
//   onEditar        - callback para regresar al formulario
//   onConfirmar     - callback para enviar al backend
//   enviando        - boolean, true mientras se hace fetch
// ============================================================

import { Pencil, Loader2, Send } from 'lucide-react';

function ResumenDatos({ datos, onEditar, onConfirmar, enviando }) {
  const filas = [
    { label: 'Nombre', valor: datos.nombre },
    { label: 'Apellido paterno', valor: datos.apellido_pat },
    { label: 'Apellido materno', valor: datos.apellido_mat },
    { label: 'Correo', valor: datos.correo },
    { label: 'Teléfono', valor: datos.telefono },
    { label: 'Empresa', valor: datos.empresa },
    { label: 'Puesto', valor: datos.puesto },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Encabezado */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-ink mb-1">
          Confirma tus datos
        </h2>
        <p className="text-sm text-click-gray">
          Revísalos antes de registrarte. Después no podrás cambiarlos.
        </p>
      </div>

      {/* Tabla de datos */}
      <div className="bg-click-gray-light rounded-xl divide-y divide-gray-200">
        {filas.map((fila) => (
          <div
            key={fila.label}
            className="px-4 py-3 flex flex-col gap-0.5"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-click-gray">
              {fila.label}
            </span>
            <span className="text-ink font-medium break-words">
              {fila.valor || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Botones */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={enviando}
          className="
            w-full
            flex items-center justify-center gap-2
            bg-click-orange hover:bg-click-orange-dark
            disabled:bg-gray-300 disabled:cursor-not-allowed
            text-white font-bold text-lg
            rounded-lg
            py-4
            transition-colors
            shadow-md
          "
        >
          {enviando ? (
            <>
              <Loader2 size={22} strokeWidth={2.5} className="animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <Send size={20} strokeWidth={2.5} />
              Confirmar y registrarme
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onEditar}
          disabled={enviando}
          className="
            w-full
            flex items-center justify-center gap-2
            bg-white hover:bg-click-gray-light
            disabled:bg-gray-100 disabled:cursor-not-allowed
            text-click-gray font-semibold
            border-2 border-gray-200
            rounded-lg
            py-3
            transition-colors
          "
        >
          <Pencil size={16} strokeWidth={2.5} />
          Editar datos
        </button>
      </div>
    </div>
  );
}

export default ResumenDatos;
