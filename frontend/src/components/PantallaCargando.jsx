// ============================================================
// frontend/src/components/PantallaCargando.jsx
// ------------------------------------------------------------
// Espera con mensaje. Se usa en dos momentos: mientras se
// "calcula" el diagnostico y mientras se envia el registro.
//
// La pausa del calculo es intencional aunque el resultado sea
// instantaneo: da peso al veredicto. Un numero que aparece de
// golpe se siente arbitrario; uno que tarda un momento se siente
// medido.
// ============================================================

function PantallaCargando({ mensaje }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span
        className="h-11 w-11 animate-girar rounded-full border-[3px] border-abismo-500
                   border-t-click-orange"
        aria-hidden="true"
      />
      <p className="mt-5 text-[13.5px] text-bruma" role="status">
        {mensaje}
      </p>
    </div>
  );
}

export default PantallaCargando;
