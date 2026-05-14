// ============================================================
// frontend/src/App.jsx
// ------------------------------------------------------------
// Placeholder del Paso 4b. Solo verifica que:
//   - Tailwind esta cargado
//   - La paleta CLICK funciona (naranja, gris, dorado)
//   - Inter se cargo desde Google Fonts
//   - Las animaciones personalizadas estan disponibles
// El formulario real se construye en el Paso 5.
// ============================================================

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center animate-bounce-in">
        <div className="inline-block bg-click-orange text-white font-bold text-2xl rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 animate-pulse-orange">
          ✓
        </div>

        <h1 className="text-3xl font-black text-ink mb-2">
          Rifa <span className="text-click-orange">QR</span>
        </h1>

        <p className="text-click-gray font-medium mb-6">
          Convencion Nacional ASOFOM
        </p>

        <div className="space-y-2 text-sm">
          <div className="bg-click-orange-light text-click-orange-dark px-4 py-2 rounded-lg font-semibold">
            Naranja CLICK funcionando
          </div>
          <div className="bg-click-gray-light text-click-gray px-4 py-2 rounded-lg font-semibold">
            Gris CLICK funcionando
          </div>
          <div className="bg-winner-light text-winner-dark px-4 py-2 rounded-lg font-semibold">
            Dorado ganador funcionando
          </div>
        </div>

        <p className="text-xs text-click-gray mt-6">
          Setup OK. Listo para construir el formulario.
        </p>
      </div>
    </div>
  );
}

export default App;
