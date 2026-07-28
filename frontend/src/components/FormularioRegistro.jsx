// ============================================================
// frontend/src/components/FormularioRegistro.jsx
// ------------------------------------------------------------
// Formulario de registro con react-hook-form.
//
// Props:
//   onSubmit       - callback(datos) que recibe los datos validados
//   defaultValues  - opcional, para precargar campos al volver
//                    desde la pantalla de resumen ("editar")
//
// Validacion:
//   - mode: 'onBlur' (validar al salir del campo)
//   - reValidateMode: 'onChange' (corregir error mientras tipea)
//
// La validacion aqui es ayuda al usuario. La validacion fuerte
// y autoritativa ocurre en el backend.
// ============================================================

import { useForm, Controller } from 'react-hook-form';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import CampoInput from './CampoInput';

// ----------------------------------------------------------
// Patrones de validacion (regex)
// ----------------------------------------------------------
// Letras (incluyendo acentos y enie), espacios, guiones,
// apostrofes. Rechaza numeros y simbolos raros.
const REGEX_NOMBRE = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;

// Formato basico de correo. No es RFC 5322 completo (eso lo
// hace validator en el backend), pero atrapa errores comunes.
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ----------------------------------------------------------
// Aviso de privacidad
// ----------------------------------------------------------
// La LFPDPPP obliga a informar al titular y recabar su
// consentimiento ANTES de capturar sus datos personales.
//
// La URL se configura con VITE_AVISO_PRIVACIDAD_URL en el .env del
// frontend. Mientras no este definida, el texto se muestra sin
// enlace: el consentimiento se sigue exigiendo, pero el usuario no
// tiene donde leer el aviso, asi que hay que configurarla antes de
// salir a produccion.
// ----------------------------------------------------------
const AVISO_URL = import.meta.env.VITE_AVISO_PRIVACIDAD_URL || '';

// ----------------------------------------------------------
// Formateador del telefono: inserta espacios mientras el
// usuario tipea, sin alterar los digitos.
//   "5"         -> "5"
//   "551"       -> "55 1"
//   "55123"     -> "55 123"
//   "5512345"   -> "55 1234 5"
//   "5512345678" -> "55 1234 5678"
// ----------------------------------------------------------
function formatearTelefono(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 10);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 2)} ${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)} ${digitos.slice(2, 6)} ${digitos.slice(6)}`;
}

// ============================================================
// Componente
// ============================================================
function FormularioRegistro({ onSubmit, defaultValues }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, dirtyFields, isValid },
    watch,
  } = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: defaultValues || {
      nombre: '',
      apellido_pat: '',
      apellido_mat: '',
      correo: '',
      telefono: '',
      empresa: '',
      puesto: '',
      acepto_privacidad: false,
    },
  });

  // ----------------------------------------------------------
  // Observamos los valores para mostrar el estado "valido"
  // (check verde) en los campos que ya tienen contenido y no
  // tienen error.
  // ----------------------------------------------------------
  const values = watch();

  const esValido = (campo) =>
    !!values[campo] &&
    values[campo].trim().length > 0 &&
    !errors[campo] &&
    dirtyFields[campo];

  // ----------------------------------------------------------
  // Reglas de validacion reutilizables
  // ----------------------------------------------------------
  const reglasNombre = (campoLabel) => ({
    required: `El ${campoLabel} es obligatorio.`,
    minLength: {
      value: 2,
      message: `El ${campoLabel} debe tener al menos 2 caracteres.`,
    },
    maxLength: {
      value: 150,
      message: `El ${campoLabel} no puede exceder 150 caracteres.`,
    },
    pattern: {
      value: REGEX_NOMBRE,
      message: `El ${campoLabel} solo puede contener letras.`,
    },
  });

  const reglasTextoLibre = (campoLabel) => ({
    required: `El campo ${campoLabel} es obligatorio.`,
    minLength: {
      value: 2,
      message: `Mínimo 2 caracteres.`,
    },
    maxLength: {
      value: 150,
      message: `Máximo 150 caracteres.`,
    },
  });

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      {/* =========================================== */}
      {/* Seccion: Datos personales                    */}
      {/* =========================================== */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-bold uppercase tracking-wider text-click-orange mb-2">
          01 • Datos personales
        </legend>

        <CampoInput
          label="Nombre(s)"
          name="nombre"
          placeholder="Ej. Irving Alejandro"
          autoComplete="given-name"
          Icon={User}
          maxLength={150}
          register={register('nombre', reglasNombre('nombre'))}
          error={errors.nombre}
          isValid={esValido('nombre')}
        />

        <CampoInput
          label="Apellido paterno"
          name="apellido_pat"
          placeholder="Ej. Peña"
          autoComplete="family-name"
          Icon={User}
          maxLength={150}
          register={register('apellido_pat', reglasNombre('apellido paterno'))}
          error={errors.apellido_pat}
          isValid={esValido('apellido_pat')}
        />

        <CampoInput
          label="Apellido materno"
          name="apellido_mat"
          placeholder="Ej. López"
          autoComplete="additional-name"
          Icon={User}
          maxLength={150}
          register={register('apellido_mat', reglasNombre('apellido materno'))}
          error={errors.apellido_mat}
          isValid={esValido('apellido_mat')}
        />
      </fieldset>

      {/* =========================================== */}
      {/* Seccion: Contacto                            */}
      {/* =========================================== */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-bold uppercase tracking-wider text-click-orange mb-2">
          02 •  Contacto
        </legend>

        <CampoInput
          label="Correo electrónico"
          name="correo"
          type="email"
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          Icon={Mail}
          maxLength={180}
          register={register('correo', {
            required: 'El correo es obligatorio.',
            maxLength: {
              value: 180,
              message: 'El correo no puede exceder 180 caracteres.',
            },
            pattern: {
              value: REGEX_CORREO,
              message: 'El formato del correo no es válido.',
            },
          })}
          error={errors.correo}
          isValid={esValido('correo')}
        />

        {/*
          Controller en lugar de register() para poder interceptar
          onChange y aplicar el formato antes de que react-hook-form
          guarde el valor.
        */}
        <Controller
          name="telefono"
          control={control}
          rules={{
            required: 'El teléfono es obligatorio.',
            validate: (valor) => {
              const soloDigitos = valor.replace(/\D/g, '');
              if (soloDigitos.length !== 10) {
                return 'Debe tener 10 dígitos (formato México).';
              }
              return true;
            },
          }}
          render={({ field }) => (
            <CampoInput
              label="Teléfono (10 dígitos)"
              name="telefono"
              type="tel"
              placeholder="55 1234 5678"
              autoComplete="tel"
              Icon={Phone}
              maxLength={13}
              register={{
                ...field,
                onChange: (e) => field.onChange(formatearTelefono(e.target.value)),
              }}
              error={errors.telefono}
              isValid={esValido('telefono')}
            />
          )}
        />
      </fieldset>

      {/* =========================================== */}
      {/* Seccion: Informacion laboral                 */}
      {/* =========================================== */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-bold uppercase tracking-wider text-click-orange mb-2">
          03 • Información laboral
        </legend>

        <CampoInput
          label="Empresa"
          name="empresa"
          placeholder="Ej. Click Seguridad Juridica"
          autoComplete="organization"
          Icon={Building2}
          maxLength={150}
          register={register('empresa', reglasTextoLibre('empresa'))}
          error={errors.empresa}
          isValid={esValido('empresa')}
        />

        <CampoInput
          label="Puesto"
          name="puesto"
          placeholder="Ej. Director Comercial"
          autoComplete="organization-title"
          Icon={Briefcase}
          maxLength={150}
          register={register('puesto', reglasTextoLibre('puesto'))}
          error={errors.puesto}
          isValid={esValido('puesto')}
        />
      </fieldset>

      {/* =========================================== */}
      {/* Consentimiento de datos personales           */}
      {/* =========================================== */}
      {/*
        Va justo antes del boton, que es el ultimo punto en el que
        el usuario puede decidir. El checkbox arranca desmarcado a
        proposito: un consentimiento premarcado no es valido.
      */}
      <div className="border-t border-gray-200 pt-5">
        <label
          htmlFor="acepto_privacidad"
          className="flex items-start gap-3 cursor-pointer"
        >
          <input
            id="acepto_privacidad"
            type="checkbox"
            className="
              mt-0.5 h-5 w-5 shrink-0
              rounded border-2 border-gray-300
              text-click-orange
              focus:ring-2 focus:ring-click-orange/30
              cursor-pointer
            "
            aria-invalid={errors.acepto_privacidad ? 'true' : 'false'}
            aria-describedby={errors.acepto_privacidad ? 'error-acepto_privacidad' : undefined}
            {...register('acepto_privacidad', {
              required: 'Debes aceptar el aviso de privacidad para continuar.',
            })}
          />
          <span className="text-sm text-click-gray leading-snug">
            He leído y acepto el{' '}
            {AVISO_URL ? (
              <a
                href={AVISO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-click-orange underline hover:text-click-orange-dark"
                // Evita que abrir el aviso alterne el checkbox
                onClick={(e) => e.stopPropagation()}
              >
                Aviso de Privacidad
              </a>
            ) : (
              <strong className="font-semibold text-ink">Aviso de Privacidad</strong>
            )}
            {' '}y autorizo el tratamiento de mis datos personales para participar
            en la rifa.
          </span>
        </label>

        {errors.acepto_privacidad && (
          <p
            id="error-acepto_privacidad"
            className="mt-2 text-sm text-danger font-medium animate-fade-up"
            role="alert"
          >
            {errors.acepto_privacidad.message}
          </p>
        )}

        {/* Recordatorio visible solo en desarrollo */}
        {!AVISO_URL && import.meta.env.DEV && (
          <p className="mt-2 text-xs text-danger">
            Falta configurar VITE_AVISO_PRIVACIDAD_URL en frontend/.env
          </p>
        )}
      </div>

      {/* =========================================== */}
      {/* Boton de envio                               */}
      {/* =========================================== */}
      <button
        type="submit"
        disabled={!isValid}
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
        Registrarme
        <ArrowRight size={22} strokeWidth={2.5} />
      </button>

      <p className="text-xs text-center text-click-gray">
        Tus datos se usarán únicamente para esta rifa.
      </p>
    </form>
  );
}

export default FormularioRegistro;
