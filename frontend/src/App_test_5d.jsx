// ============================================================
// frontend/src/App.jsx (TEMPORAL - Paso 5d)
// ------------------------------------------------------------
// Vista de prueba de las dos pantallas de resultado.
// Boton arriba para alternar entre Ganador y Participante.
// Sera reemplazado en el Paso 5e por el orquestador completo.
// ============================================================

import { useState } from 'react';
import ResultadoGanador from './components/ResultadoGanador';
import ResultadoParticipante from './components/ResultadoParticipante';

function App() {
  const [vista, setVista] = useState('ganador'); // 'ganador' | 'participante'

  // Datos de ejemplo
  const datosGanador = {
    numeroRegistro: 5,
    nombreCompleto: 'Irving Peña López',
    premio: 'Premio Mayor: iPad Pro 11"',
  };

  const datosParticipante = {
    numeroRegistro: 47,
    nombreCompleto: 'Irving Peña López',
  };

  const handleNoSoyYo = () => {
    alert('Aqui se borraria localStorage y se volveria al form');
  };

  return (
    <div className="min-h-screen py-10 px-4">
      {/* Toggle de vistas (solo para pruebas) */}
      <div className="max-w-md mx-auto mb-4 flex gap-2">
        <button
          onClick={() => setVista('ganador')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            vista === 'ganador'
              ? 'bg-click-orange text-white'
              : 'bg-white text-click-gray border border-gray-200'
          }`}
        >
          Ver: Ganador
        </button>
        <button
          onClick={() => setVista('participante')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            vista === 'participante'
              ? 'bg-click-orange text-white'
              : 'bg-white text-click-gray border border-gray-200'
          }`}
        >
          Ver: Participante
        </button>
      </div>

      {/* Pantalla actual */}
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        {vista === 'ganador' ? (
          <ResultadoGanador
            key="ganador"
            {...datosGanador}
            onNoSoyYo={handleNoSoyYo}
          />
        ) : (
          <ResultadoParticipante
            key="participante"
            {...datosParticipante}
            onNoSoyYo={handleNoSoyYo}
          />
        )}
      </div>
    </div>
  );
}

export default App;
