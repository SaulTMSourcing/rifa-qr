// ============================================================
// frontend/src/components/FormularioCaptura.jsx
// ------------------------------------------------------------
// Ultimo paso antes del registro: nombre completo, empresa,
// telefono, correo y monto promedio de creditos.
//
// La validacion de aqui es ayuda al usuario. La autoritativa vive
// en el backend (utils/normalizar.js), que no confia en nada de
// lo que llegue del navegador.
//
// mode 'onBlur' + reValidateMode 'onChange': no se regana a nadie
// mientras escribe, pero en cuanto corrige el error desaparece.
//
// EL BOTON DE ENVIO NUNCA SE DESHABILITA. Es deliberado:
//
//   Con mode 'onBlur', un campo que nunca perdio el foco no se ha
//   validado. La casilla de privacidad es el ultimo elemento antes
//   del boton, asi que el camino natural es llenar todo, marcarla y
//   tocar Enviar de inmediato: en ese momento la casilla no ha
//   perdido el foco, isValid sigue en false y el boton queda muerto
//   sin explicar por que. Habria que tocar en otro lado primero,
//   algo que nadie deduce. Se detecto probando el flujo completo en
//   el navegador.
//
//   Dejandolo siempre activo, al tocarlo react-hook-form valida
//   todo, muestra los errores y (shouldFocusError, activo por
//   defecto) lleva el foco al primer campo que falla. La persona
//   siempre recibe respuesta, en vez de un boton apagado y mudo.
// ============================================================

import { useForm, Controller } from 'react-hook-form';
import { MONTOS } from '../tiburometro';

// Letras con acentos y enie, espacios, guiones y apostrofes.
// Rechaza digitos y simbolos, que en un nombre siempre son error.
const REGEX_NOMBRE = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/;

// Formato basico. El RFC completo lo valida `validator` en el
// backend; esto solo atrapa los errores obvios antes de enviar.
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// URL del aviso de privacidad. Sin definir, el texto se muestra
// sin enlace: el consentimiento se sigue exigiendo.
const AVISO_URL = import.meta.env.VITE_AVISO_PRIVACIDAD_URL || '';

// ------------------------------------------------------------
// Formatea el telefono mientras se teclea, sin alterar digitos:
//   "5512345678" -> "55 1234 5678"
// ------------------------------------------------------------
function formatearTelefono(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

// ------------------------------------------------------------
// Campo con etiqueta y mensaje de error
// ------------------------------------------------------------
function Campo({ id, etiqueta, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11.5px] text-bruma">
        {etiqueta}
      </label>
      {children}
      {error && (
        <p
          id={`error-${id}`}
          role="alert"
          className="mt-1.5 text-[12px] font-medium text-zona-sharks"
        >
          {error.message}
        </p>
      )}
    </div>
  );
}

// ============================================================
function FormularioCaptura({ onEnviar, valoresIniciales }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: valoresIniciales || {
      nombre_completo: '',
      empresa: '',
      telefono: '',
      correo: '',
      monto_promedio: '',
      acepto_privacidad: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onEnviar)} noValidate className="flex h-full flex-col pt-2">
      <p className="font-mono text-[11px] uppercase tracking-[.1em] text-click-orange">
        Último paso
      </p>

      <h1 className="mt-3 font-display text-[24px] font-bold leading-[1.16] tracking-[-.01em]">
        Recibe tu diagnóstico y ¡gana un premio!
      </h1>

      {/*
        No se promete ningun correo: el envio quedo fuera de alcance y los
        registros se usaran en una campana posterior. Prometer algo que no
        va a llegar es peor que no prometerlo.
      */}
      <p className="mt-2.5 text-[13.5px] leading-[1.5] text-bruma">
        Déjanos tus datos para participar por uno de los regalos que se
        entregan el viernes 28 de agosto en el stand 25, al terminar la
        última ponencia.
      </p>

      <div className="mt-5 flex flex-col gap-3.5">
        <Campo id="nombre_completo" etiqueta="Nombre completo" error={errors.nombre_completo}>
          <input
            id="nombre_completo"
            type="text"
            autoComplete="name"
            placeholder="Ej. Ana Sofía Del Valle"
            maxLength={300}
            className="campo"
            aria-invalid={errors.nombre_completo ? 'true' : 'false'}
            aria-describedby={errors.nombre_completo ? 'error-nombre_completo' : undefined}
            {...register('nombre_completo', {
              required: 'Escribe tu nombre completo.',
              minLength: { value: 3, message: 'Escribe al menos 3 caracteres.' },
              maxLength: { value: 300, message: 'Máximo 300 caracteres.' },
              pattern: { value: REGEX_NOMBRE, message: 'El nombre solo puede contener letras.' },
            })}
          />
        </Campo>

        <Campo id="empresa" etiqueta="Empresa" error={errors.empresa}>
          <input
            id="empresa"
            type="text"
            autoComplete="organization"
            placeholder="Nombre de tu SOFOM"
            maxLength={150}
            className="campo"
            aria-invalid={errors.empresa ? 'true' : 'false'}
            aria-describedby={errors.empresa ? 'error-empresa' : undefined}
            {...register('empresa', {
              required: 'Escribe el nombre de tu empresa.',
              minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
              maxLength: { value: 150, message: 'Máximo 150 caracteres.' },
            })}
          />
        </Campo>

        <Campo id="telefono" etiqueta="Teléfono (10 dígitos)" error={errors.telefono}>
          {/*
            Controller en vez de register() para poder formatear el
            valor antes de que react-hook-form lo guarde.
          */}
          <Controller
            name="telefono"
            control={control}
            rules={{
              required: 'Escribe tu teléfono.',
              validate: (v) =>
                v.replace(/\D/g, '').length === 10 ||
                'Debe tener 10 dígitos (formato México).',
            }}
            render={({ field }) => (
              <input
                id="telefono"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="55 1234 5678"
                maxLength={13}
                className="campo"
                aria-invalid={errors.telefono ? 'true' : 'false'}
                aria-describedby={errors.telefono ? 'error-telefono' : undefined}
                {...field}
                onChange={(e) => field.onChange(formatearTelefono(e.target.value))}
              />
            )}
          />
        </Campo>

        <Campo id="correo" etiqueta="Correo" error={errors.correo}>
          <input
            id="correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tucorreo@empresa.com"
            maxLength={180}
            className="campo"
            aria-invalid={errors.correo ? 'true' : 'false'}
            aria-describedby={errors.correo ? 'error-correo' : undefined}
            {...register('correo', {
              required: 'Escribe tu correo.',
              maxLength: { value: 180, message: 'Máximo 180 caracteres.' },
              pattern: { value: REGEX_CORREO, message: 'El formato del correo no es válido.' },
            })}
          />
        </Campo>

        <Campo
          id="monto_promedio"
          etiqueta="Monto promedio de tus créditos"
          error={errors.monto_promedio}
        >
          <select
            id="monto_promedio"
            className="campo"
            aria-invalid={errors.monto_promedio ? 'true' : 'false'}
            aria-describedby={errors.monto_promedio ? 'error-monto_promedio' : undefined}
            defaultValue=""
            {...register('monto_promedio', { required: 'Elige un rango.' })}
          >
            {/*
              Opcion vacia deshabilitada: sin esto el primer rango
              quedaria preseleccionado y mucha gente lo enviaria sin
              leer, ensuciando el dato comercial mas util del evento.
            */}
            <option value="" disabled>
              Selecciona un rango
            </option>
            {MONTOS.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {/* ─── Consentimiento ─── */}
      <div className="mt-5 border-t border-abismo-500 pt-4">
        <label htmlFor="acepto_privacidad" className="flex cursor-pointer items-start gap-3">
          <input
            id="acepto_privacidad"
            type="checkbox"
            className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded
                       border-2 border-abismo-500 bg-abismo-600 accent-click-orange"
            aria-invalid={errors.acepto_privacidad ? 'true' : 'false'}
            {...register('acepto_privacidad', {
              required: 'Debes aceptar el aviso de privacidad para continuar.',
            })}
          />
          <span className="text-[12.5px] leading-snug text-bruma">
            He leído y acepto el{' '}
            {AVISO_URL ? (
              <a
                href={AVISO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-click-orange underline hover:text-click-orange-hi"
              >
                Aviso de Privacidad
              </a>
            ) : (
              <strong className="font-semibold text-espuma">Aviso de Privacidad</strong>
            )}{' '}
            y autorizo el tratamiento de mis datos personales.
          </span>
        </label>

        {errors.acepto_privacidad && (
          <p role="alert" className="mt-2 text-[12px] font-medium text-zona-sharks">
            {errors.acepto_privacidad.message}
          </p>
        )}

        {!AVISO_URL && import.meta.env.DEV && (
          <p className="mt-2 text-[11px] text-zona-sharks">
            Falta configurar VITE_AVISO_PRIVACIDAD_URL en frontend/.env
          </p>
        )}
      </div>

      <button type="submit" className="boton mt-5">
        Enviar y participar
      </button>
    </form>
  );
}

export default FormularioCaptura;
