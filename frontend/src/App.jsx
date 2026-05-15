// ============================================================
// frontend/src/App.jsx (TEMPORAL - Paso 5c)
// ------------------------------------------------------------
// Vista de prueba del formulario completo. Al enviar, muestra
// los datos capturados en pantalla. Sera reemplazado en el
// Paso 5d por el orquestador real con flujo de resumen previo.
// ============================================================
 
import { useState } from 'react';
import FormularioRegistro from './components/FormularioRegistro';
 
function App() {
  const [datosCapturados, setDatosCapturados] = useState(null);
 
  const handleSubmit = (datos) => {
    console.log('Datos del formulario:', datos);
    setDatosCapturados(datos);
  };
 
  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black text-ink mb-2">
            Convención <span className="text-click-orange">ASOFOM</span>
          </h1>
          <p className="text-click-gray font-medium">
            Registro al evento + rifa
          </p>
        </header>
 
        <FormularioRegistro onSubmit={handleSubmit} />
 
        {/* Bloque de debug: muestra lo que llego al submit */}
        {datosCapturados && (
          <div className="mt-8 p-4 bg-click-orange-light rounded-lg animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-wider text-click-orange-dark mb-2">
              Datos capturados (debug)
            </p>
            <pre className="text-xs text-ink overflow-x-auto">
              {JSON.stringify(datosCapturados, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
 
export default App;
 