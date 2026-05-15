// ============================================================
// frontend/src/App.jsx
// ------------------------------------------------------------
// Orquestador principal de la aplicacion.
//
// Maneja:
//   - Maquina de estados (cargando / formulario / resumen /
//     enviando / resultado / error)
//   - Persistencia en localStorage (decision: no permitir
//     re-registro en el mismo dispositivo, con escape "no soy yo")
//   - Llamada al backend y manejo de errores tipados
//   - Header con identidad del evento
//
// La logica de UI esta delegada a los componentes hijos.
// App.jsx solo coordina y mantiene estado global.
// ============================================================
 
import { useState, useEffect } from 'react';
import {
  registrarParticipante,
  NetworkError,
  ApiError,
} from './services/api';
import FormularioRegistro from './components/FormularioRegistro';
import ResumenDatos from './components/ResumenDatos';
import ResultadoGanador from './components/ResultadoGanador';
import ResultadoParticipante from './components/ResultadoParticipante';
import ResultadoError from './components/ResultadoError';
 
// ------------------------------------------------------------
// Clave en localStorage. Versionada por si en el futuro el
// schema del objeto cambia: levantando el numero invalidamos
// registros viejos sin romper.
// ------------------------------------------------------------
const LS_KEY = 'rifa-qr:registro:v1';
 
function App() {
  // ----------------------------------------------------------
  // Estado de la maquina de estados.
  //   'cargando'    -> revisando localStorage al iniciar
  //   'formulario'  -> mostrando el form de captura
  //   'resumen'     -> confirmando datos antes de enviar
  //   'resultado'   -> mostrando ganador o participante
  //   'error'       -> mostrando pantalla de error
  // ----------------------------------------------------------
  const [vista, setVista] = useState('cargando');
 
  // Datos del formulario (se conservan entre vistas para "editar")
  const [datosFormulario, setDatosFormulario] = useState(null);
 
  // Estado de envio (spinner del boton en resumen)
  const [enviando, setEnviando] = useState(false);
 
  // Resultado exitoso del backend
  const [resultado, setResultado] = useState(null);
 
  // Info del error, si hay
  const [errorInfo, setErrorInfo] = useState(null);
 
  // ----------------------------------------------------------
  // Efecto inicial: revisar localStorage
  // ----------------------------------------------------------
  // Si ya hay un registro guardado, mostrar directo el resultado.
  // Si no, mostrar el formulario.
  // ----------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const guardado = JSON.parse(raw);
        // Validacion minima de integridad
        if (
          guardado &&
          typeof guardado.numeroRegistro === 'number' &&
          typeof guardado.nombreCompleto === 'string'
        ) {
          setResultado(guardado);
          setVista('resultado');
          return;
        }
      }
    } catch {
      // localStorage corrupto: lo limpiamos y seguimos
      localStorage.removeItem(LS_KEY);
    }
    setVista('formulario');
  }, []);
 
  // ----------------------------------------------------------
  // Handler: el formulario hace submit -> mostrar resumen
  // ----------------------------------------------------------
  const handleFormularioSubmit = (datos) => {
    setDatosFormulario(datos);
    setVista('resumen');
  };
 
  // ----------------------------------------------------------
  // Handler: usuario hace click en "Editar datos" desde el resumen
  // ----------------------------------------------------------
  const handleEditar = () => {
    setErrorInfo(null);
    setVista('formulario');
  };
 
  // ----------------------------------------------------------
  // Handler: usuario confirma el envio al backend
  // ----------------------------------------------------------
  const handleConfirmar = async () => {
    if (!datosFormulario) return;
 
    setEnviando(true);
    setErrorInfo(null);
 
    try {
      const respuesta = await registrarParticipante(datosFormulario);
 
      // Construir nombre completo para mostrar en pantalla
      const nombreCompleto = [
        datosFormulario.nombre,
        datosFormulario.apellido_pat,
        datosFormulario.apellido_mat,
      ]
        .filter(Boolean)
        .join(' ');
 
      const objetoResultado = {
        numeroRegistro: respuesta.numeroRegistro,
        esGanador: respuesta.esGanador,
        premio: respuesta.premio,
        nombreCompleto,
        fechaRegistro: new Date().toISOString(),
      };
 
      // Persistir en localStorage
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(objetoResultado));
      } catch {
        // Si localStorage no esta disponible (modo incognito viejo,
        // cuota llena, etc.) no es critico: seguimos.
      }
 
      setResultado(objetoResultado);
      setVista('resultado');
    } catch (error) {
      // ----------------------------------------------------
      // Mapear error a la pantalla de error correspondiente
      // ----------------------------------------------------
      if (error instanceof NetworkError) {
        setErrorInfo({
          tipo: 'red',
          mensaje: error.message,
        });
      } else if (error instanceof ApiError) {
        if (error.tipo === 'correo_duplicado') {
          setErrorInfo({
            tipo: 'correo_duplicado',
            mensaje:
              'El correo que ingresaste ya está registrado en la rifa. Si ya te registraste, no es necesario hacerlo de nuevo.',
          });
        } else if (error.tipo === 'rate_limit_exceeded') {
          setErrorInfo({
            tipo: 'rate_limit',
            mensaje:
              'Se han realizado demasiados intentos desde esta conexión. Espera unos minutos e intenta de nuevo.',
          });
        } else if (error.tipo === 'datos_invalidos') {
          // El backend rechazo datos que el frontend no atrapo.
          // Devolvemos al form para que corrija.
          setErrorInfo({
            tipo: 'generico',
            mensaje: `Hay un problema con el campo ${error.campo}: ${error.mensaje}`,
          });
        } else {
          setErrorInfo({
            tipo: 'generico',
            mensaje: error.message,
          });
        }
      } else {
        setErrorInfo({
          tipo: 'generico',
          mensaje: 'Ocurrió un error inesperado. Intenta de nuevo.',
        });
      }
 
      setVista('error');
    } finally {
      setEnviando(false);
    }
  };
 
  // ----------------------------------------------------------
  // Handler: usuario hace click en "No soy yo" desde el resultado
  // Limpia localStorage y vuelve al formulario.
  // ----------------------------------------------------------
  const handleNoSoyYo = () => {
    if (
      window.confirm(
        '¿Seguro que deseas borrar este registro y registrar a otra persona? Esta acción no se puede deshacer en este dispositivo.'
      )
    ) {
      localStorage.removeItem(LS_KEY);
      setResultado(null);
      setDatosFormulario(null);
      setVista('formulario');
    }
  };
 
  // ==========================================================
  // Render
  // ==========================================================
  return (
    <div className="min-h-screen flex flex-col">
      {/* =================================================== */}
      {/* Header global                                        */}
      {/* =================================================== */}
      <header className="bg-white border-b border-gray-200 px-4 py-5 shadow-sm">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-click-orange mb-1">
            Convención Nacional ASOFOM
          </p>
          <h1 className="text-2xl font-black text-ink">
            Registro <span className="text-click-orange">CLICK</span>
          </h1>
          <p className="text-xs text-click-gray mt-1">
            Regístrate y participa en la rifa
          </p>
        </div>
      </header>
 
      {/* =================================================== */}
      {/* Contenido principal                                  */}
      {/* =================================================== */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Estado: cargando */}
          {vista === 'cargando' && (
            <div className="py-16 text-center text-click-gray">
              <p className="text-sm">Cargando...</p>
            </div>
          )}
 
          {/* Estado: formulario */}
          {vista === 'formulario' && (
            <FormularioRegistro
              onSubmit={handleFormularioSubmit}
              defaultValues={datosFormulario}
            />
          )}
 
          {/* Estado: resumen */}
          {vista === 'resumen' && datosFormulario && (
            <ResumenDatos
              datos={datosFormulario}
              onEditar={handleEditar}
              onConfirmar={handleConfirmar}
              enviando={enviando}
            />
          )}
 
          {/* Estado: resultado (ganador o participante) */}
          {vista === 'resultado' && resultado && (
            <>
              {resultado.esGanador ? (
                <ResultadoGanador
                  numeroRegistro={resultado.numeroRegistro}
                  nombreCompleto={resultado.nombreCompleto}
                  premio={resultado.premio}
                  onNoSoyYo={handleNoSoyYo}
                />
              ) : (
                <ResultadoParticipante
                  numeroRegistro={resultado.numeroRegistro}
                  nombreCompleto={resultado.nombreCompleto}
                  onNoSoyYo={handleNoSoyYo}
                />
              )}
            </>
          )}
 
          {/* Estado: error */}
          {vista === 'error' && errorInfo && (
            <ResultadoError
              tipo={errorInfo.tipo}
              mensaje={errorInfo.mensaje}
              onReintentar={handleConfirmar}
              onEditar={handleEditar}
            />
          )}
        </div>
      </main>
 
      {/* =================================================== */}
      {/* Footer                                               */}
      {/* =================================================== */}
      <footer className="px-4 py-4 text-center text-xs text-click-gray">
        <p>CLICK Seguridad Jurídica · ASOFOM 2026</p>
      </footer>
    </div>
  );
}
 
export default App;