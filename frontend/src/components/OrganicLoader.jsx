// ============================================================
// frontend/src/components/OrganicLoader.jsx
// ------------------------------------------------------------
// Loader orgánico #01: dos blobs naranjo y gris orbitando
// con efecto goo (metaball), y un número visible al centro.
//
// Props:
//   numero   - dígito o texto a mostrar en el centro (default: null)
//   label    - texto debajo del loader (default: null)
// ============================================================

function OrganicLoader({ numero = null, label = null }) {
  return (
    <div className="flex flex-col items-center gap-4">

      {/* ── Wrapper con posición relativa para el número superpuesto ── */}
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Filtro goo: blur + color-matrix crea el efecto metaball */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <filter id="organic-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix
                in="blur" mode="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 22 -11"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        {/* Stage con el filtro aplicado — los blobs se fusionan aquí */}
        <div
          style={{
            filter: 'url(#organic-goo)',
            width: 140,
            height: 140,
            position: 'relative',
          }}
        >
          {/* Blob A — naranja CLICK */}
          <div
            className="organic-blob-a"
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 64, height: 64,
              borderRadius: '50%',
              marginTop: -32, marginLeft: -32,
              background: '#ff6b00',
            }}
          />
          {/* Blob B — gris CLICK */}
          <div
            className="organic-blob-b"
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 64, height: 64,
              borderRadius: '50%',
              marginTop: -32, marginLeft: -32,
              background: '#54565a',
            }}
          />
        </div>

        {/* Número central — encima del canvas de los blobs */}
        {numero !== null && (
          <span
            style={{
              position: 'absolute',
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 900,
              fontFamily: 'Inter, -apple-system, sans-serif',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              zIndex: 10,
              userSelect: 'none',
              textShadow: '0 1px 6px rgba(0,0,0,0.25)',
            }}
            aria-hidden="true"
          >
            {numero}
          </span>
        )}
      </div>

      {/* Label opcional debajo */}
      {label && (
        <p className="text-sm font-semibold text-click-gray">{label}</p>
      )}
    </div>
  );
}

export default OrganicLoader;
