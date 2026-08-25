// ============================================================
// frontend/src/components/PantallaBienvenida.jsx
// ------------------------------------------------------------
// Primera pantalla. Su unico trabajo es que la persona toque el
// boton, asi que el titular carga todo el peso y el resto respira.
//
// Los elementos entran escalonados: el ojo sigue el orden de
// lectura en vez de recibir el bloque completo de golpe.
// ============================================================

function PantallaBienvenida({ onEmpezar }) {
  return (
    <div className="flex h-full flex-col pt-8">
      <p
        className="animate-entrar font-mono text-[11px] uppercase tracking-[.1em] text-click-orange"
        style={{ animationDelay: '40ms' }}
      >
        Sistema de Garantías
      </p>

      <h1
        className="animate-entrar mt-3 font-display text-[30px] font-bold leading-[1.12] tracking-[-.01em]"
        style={{ animationDelay: '120ms' }}
      >
        ¿Qué tan expuesta está tu cartera de crédito?
      </h1>

      <p
        className="animate-entrar mt-3.5 text-[14.5px] leading-[1.55] text-bruma"
        style={{ animationDelay: '200ms' }}
      >
        Responde 3 preguntas y descubre en 90 segundos tu nivel de
        exposición frente al riesgo de impago.
      </p>

      <button
        type="button"
        onClick={onEmpezar}
        className="boton animate-entrar mt-auto"
        style={{ animationDelay: '290ms' }}
      >
        Descubre tu nivel
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

export default PantallaBienvenida;
