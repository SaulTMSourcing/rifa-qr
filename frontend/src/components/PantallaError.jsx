// ============================================================
// frontend/src/components/PantallaError.jsx
// ------------------------------------------------------------
// Pantalla de error del envio.
//
// Cada tipo ofrece la accion que de verdad resuelve ESE problema:
// reintentar no sirve de nada si el correo ya esta registrado, y
// corregir datos no sirve si lo que fallo fue la red.
//
// Props:
//   tipo         - red | correo_duplicado | rate_limit | generico
//   mensaje      - texto ya resuelto por quien llama
//   onReintentar - reenvia el mismo registro
//   onEditar     - vuelve al formulario
// ============================================================

const ICONO = {
  red: '⚡',
  correo_duplicado: '✉',
  rate_limit: '⏳',
  generico: '!',
};

function PantallaError({ tipo = 'generico', mensaje, onReintentar, onEditar }) {
  // Con el correo ya registrado, reintentar volveria a fallar
  // exactamente igual: lo unico util es corregir el dato.
  const puedeReintentar = tipo !== 'correo_duplicado';

  return (
    <div className="flex h-full flex-col items-center pt-8 text-center">
      <div
        className="animate-entrar flex h-14 w-14 items-center justify-center rounded-full
                   border-2 border-zona-sharks text-2xl text-zona-sharks"
        aria-hidden="true"
      >
        {ICONO[tipo] || ICONO.generico}
      </div>

      <h1
        className="animate-entrar mt-5 font-display text-[22px] font-bold leading-tight"
        style={{ animationDelay: '80ms' }}
      >
        {tipo === 'correo_duplicado' ? 'Ese correo ya está registrado' : 'No pudimos registrarte'}
      </h1>

      <p
        className="animate-entrar mt-3 text-[13.5px] leading-[1.55] text-bruma"
        style={{ animationDelay: '160ms' }}
        role="alert"
      >
        {mensaje}
      </p>

      <div className="mt-auto flex w-full flex-col gap-2.5 pt-6">
        {puedeReintentar && onReintentar && (
          <button type="button" onClick={onReintentar} className="boton">
            Reintentar
          </button>
        )}
        {onEditar && (
          <button type="button" onClick={onEditar} className="boton boton-fantasma">
            Corregir mis datos
          </button>
        )}
      </div>
    </div>
  );
}

export default PantallaError;
