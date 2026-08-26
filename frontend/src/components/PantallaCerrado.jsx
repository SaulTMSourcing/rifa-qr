// ============================================================
// frontend/src/components/PantallaCerrado.jsx
// ------------------------------------------------------------
// Se muestra cuando el registro ya cerro.
//
// Aparece en dos momentos distintos:
//   - al abrir la app, si el sondeo de salud dice que esta cerrado
//   - al enviar el formulario, si cerro mientras la persona lo
//     llenaba (el backend responde 403 registro_cerrado)
//
// El segundo caso es el que importa cuidar: alguien que llego tarde
// y alcanzo a llenar todo merece una explicacion clara, no un error
// generico.
// ============================================================

function PantallaCerrado() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-1 text-center">
      <div
        className="animate-entrar flex h-14 w-14 items-center justify-center rounded-full
                   border-2 border-bruma2 text-2xl text-bruma"
        aria-hidden="true"
      >
        ⏱
      </div>

      <h1
        className="animate-entrar mt-5 font-display text-[24px] font-bold leading-tight"
        style={{ animationDelay: '90ms' }}
      >
        El registro ya cerró
      </h1>

      <p
        className="animate-entrar mt-3.5 text-[14px] leading-[1.55] text-bruma"
        style={{ animationDelay: '170ms' }}
      >
        Gracias por tu interés. Los ganadores se anuncian el{' '}
        <strong className="text-espuma">viernes 28 de agosto en el stand 25</strong>,
        al terminar la última ponencia.
      </p>

      <p
        className="animate-entrar mt-4 text-[13px] leading-[1.5] text-bruma2"
        style={{ animationDelay: '250ms' }}
      >
        Si ya te habías registrado, tu número sigue siendo válido.
        Pásate al stand y con gusto te atendemos.
      </p>
    </div>
  );
}

export default PantallaCerrado;
