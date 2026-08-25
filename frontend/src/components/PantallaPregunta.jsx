// ============================================================
// frontend/src/components/PantallaPregunta.jsx
// ------------------------------------------------------------
// Una de las tres preguntas del Tiburometro.
//
// Props:
//   pregunta - { titulo, opciones[] } del catalogo
//   numero   - 1, 2 o 3, para el rotulo de avance
//   elegida  - posicion elegida (1-4) o null
//   onElegir - callback(posicion)
//
// Las opciones son botones, no radios: cada toque avanza solo, sin
// un boton de "siguiente". En una fila de registro con el celular
// en la mano, cada toque que se ahorra cuenta.
//
// El numerito de la derecha es deliberado: refuerza que esto es un
// instrumento de medicion, y de paso da referencia visual de que
// las opciones van de menor a mayor exposicion.
// ============================================================

function PantallaPregunta({ pregunta, numero, elegida, onElegir }) {
  return (
    <div className="flex h-full flex-col pt-2">
      <p className="font-mono text-[11px] uppercase tracking-[.1em] text-click-orange">
        Pregunta {numero} de 3
      </p>

      <h1 className="mt-3 font-display text-[25px] font-bold leading-[1.16] tracking-[-.01em]">
        {pregunta.titulo}
      </h1>

      <div className="mt-7 flex flex-col gap-2.5">
        {pregunta.opciones.map((texto, i) => {
          const posicion = i + 1;
          return (
            <button
              key={texto}
              type="button"
              onClick={() => onElegir(posicion)}
              data-elegida={elegida === posicion}
              aria-pressed={elegida === posicion}
              className="opcion animate-entrar"
              style={{ animationDelay: `${70 + i * 70}ms` }}
            >
              <span>{texto}</span>
              <span className="shrink-0 font-mono text-[10px] text-bruma2" aria-hidden="true">
                {String(posicion).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PantallaPregunta;
