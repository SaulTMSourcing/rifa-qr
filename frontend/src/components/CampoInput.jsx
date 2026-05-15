// ============================================================
// frontend/src/components/CampoInput.jsx
// ------------------------------------------------------------
// Componente de input reutilizable usado por todos los campos
// del formulario de registro.
//
// Props:
//   label           - texto del label (visible)
//   name            - id del campo (debe coincidir con react-hook-form)
//   type            - 'text' | 'email' | 'tel' (default: 'text')
//   placeholder     - texto fantasma del input
//   Icon            - opcional, componente de lucide-react (ej. Mail, Phone)
//   autoComplete    - hint para autollenado del navegador
//   register        - funcion register() de react-hook-form
//   error           - objeto error de react-hook-form (o undefined)
//   isValid         - boolean, true si el campo es valido y tiene valor
//   maxLength       - limite de caracteres
//
// Estados visuales:
//   - Normal:  borde gris claro
//   - Foco:    borde naranja CLICK
//   - Error:   borde rojo + mensaje de error
//   - Valido:  borde verde sutil + icono check
// ============================================================

import { Check } from 'lucide-react';

function CampoInput({
  label,
  name,
  type = 'text',
  placeholder,
  Icon,
  autoComplete,
  register,
  error,
  isValid,
  maxLength,
}) {
  // ----------------------------------------------------------
  // Calcular las clases del input segun el estado.
  // ----------------------------------------------------------
  const tieneError = !!error;
  const mostrarValido = isValid && !tieneError;

  const baseClasses = `
    w-full
    rounded-lg
    border-2
    bg-white
    px-4 py-3
    text-ink
    placeholder:text-gray-400
    transition-colors
    focus:outline-none
  `;

  let estadoClasses;
  if (tieneError) {
    estadoClasses = 'border-danger focus:border-danger';
  } else if (mostrarValido) {
    estadoClasses = 'border-success focus:border-success';
  } else {
    estadoClasses = 'border-gray-200 focus:border-click-orange';
  }

  // Ajuste de padding si hay icono a la izquierda
  const paddingIcon = Icon ? 'pl-11' : '';

  const inputId = `campo-${name}`;
  const errorId = `error-${name}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-click-gray"
      >
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-click-gray pointer-events-none"
            aria-hidden="true"
          >
            <Icon size={20} strokeWidth={2} />
          </span>
        )}

        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={tieneError ? 'true' : 'false'}
          aria-describedby={tieneError ? errorId : undefined}
          className={`${baseClasses} ${estadoClasses} ${paddingIcon}`}
          {...register}
        />

        {mostrarValido && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-success pointer-events-none"
            aria-hidden="true"
          >
            <Check size={20} strokeWidth={3} />
          </span>
        )}
      </div>

      {tieneError && (
        <p
          id={errorId}
          className="text-sm text-danger font-medium animate-fade-up"
          role="alert"
        >
          {error.message}
        </p>
      )}
    </div>
  );
}

export default CampoInput;
