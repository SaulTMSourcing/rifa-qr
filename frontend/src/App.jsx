// ============================================================
// frontend/src/App.jsx
// ------------------------------------------------------------
// Orquestador del flujo completo.
//
//   bienvenida -> q1 -> q2 -> q3 -> calculando -> diagnostico
//              -> captura -> enviando -> resultado
//                                     -> error
//
// App solo coordina: mantiene el estado, decide que pantalla toca
// y habla con el backend. Todo lo visual vive en los componentes.
//
// El Marco (encabezado + Tiburometro) NO se desmonta entre
// pantallas: el avance del tiburon a lo largo del cuestionario es
// continuo, y remontarlo lo reiniciaria en cada transicion.
// ============================================================

import { useState, useEffect } from 'react';
import {
  registrarParticipante,
  healthCheck,
  NetworkError,
  ApiError,
} from './services/api';
import { PREGUNTAS, nivelPorPuntaje, posicionParcial } from './tiburometro';

import Marco from './components/Marco';
import PantallaBienvenida from './components/PantallaBienvenida';
import PantallaPregunta from './components/PantallaPregunta';
import PantallaCargando from './components/PantallaCargando';
import PantallaDiagnostico from './components/PantallaDiagnostico';
import FormularioCaptura from './components/FormularioCaptura';
import PantallaResultado from './components/PantallaResultado';
import PantallaError from './components/PantallaError';

// ------------------------------------------------------------
// Clave de localStorage, versionada.
// ------------------------------------------------------------
// Sube a v2 porque el objeto guardado cambio de forma: antes traia
// nombre y apellidos por separado. Con v1 se leerian registros
// viejos incompatibles y la pantalla de resultado quedaria a
// medias; subir la version los invalida sin romper nada.
// ------------------------------------------------------------
const LS_CLAVE = 'rifa-qr:registro:v2';

// Duracion de la pausa del "calculo". No hay nada que calcular,
// pero un veredicto instantaneo se siente arbitrario.
const MS_CALCULO = 1400;

// Cada cuanto se reintenta el sondeo mientras el backend no
// responda. 15 s es suficiente para que el aviso desaparezca casi
// enseguida tras un corte breve, sin castigar la red del evento.
const MS_REINTENTO_SALUD = 15000;

const RESPUESTAS_VACIAS = {
  q1_garantia: 0,
  q2_cartera_vencida: 0,
  q3_recuperacion: 0,
};

// ------------------------------------------------------------
// leerRegistroGuardado(): recupera el registro de este dispositivo.
//
// Se lee al INICIALIZAR el estado, no dentro de un efecto. Hacerlo
// en un efecto obligaria a pintar primero una pantalla de carga y
// reemplazarla enseguida: un render de mas y un parpadeo visible
// en cada apertura. localStorage es sincrono, no hay nada que
// esperar.
//
// Un JSON corrupto o de una version anterior se descarta y se
// limpia, para que un solo registro malo no deje el dispositivo
// inservible durante el evento.
// ------------------------------------------------------------
function leerRegistroGuardado() {
  try {
    const crudo = localStorage.getItem(LS_CLAVE);
    if (!crudo) return null;
    const guardado = JSON.parse(crudo);
    if (guardado && typeof guardado.numeroRegistro === 'number') return guardado;
  } catch {
    localStorage.removeItem(LS_CLAVE);
  }
  return null;
}

function App() {
  const [resultado, setResultado] = useState(leerRegistroGuardado);
  const [vista, setVista] = useState(resultado ? 'resultado' : 'bienvenida');
  const [respuestas, setRespuestas] = useState(RESPUESTAS_VACIAS);
  const [datosFormulario, setDatosFormulario] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [backendCaido, setBackendCaido] = useState(false);

  // ----------------------------------------------------------
  // Sondeo del backend, sin bloquear la interfaz
  // ----------------------------------------------------------
  // Si no responde se avisa, pero se deja continuar: es preferible
  // que la persona llene el formulario y falle al final a que se
  // quede mirando una pantalla muerta.
  //
  // Mientras siga caido se reintenta, y el aviso desaparece solo en
  // cuanto el backend vuelve. Sondear una sola vez al abrir tiene
  // un problema serio en un evento: basta un parpadeo del WiFi
  // justo en ese instante para que la persona cargue con un banner
  // rojo toda la sesion aunque todo funcione, y hay quien abandona
  // el registro al verlo. Con cientos de asistentes en la red
  // compartida del recinto, eso le pasa a alguien seguro.
  //
  // Ya sano no se sigue sondeando: no tiene caso gastar red del
  // evento repitiendo una consulta que ya salio bien.
  // ----------------------------------------------------------
  useEffect(() => {
    let montado = true;
    let temporizador;

    const sondear = async () => {
      const ok = await healthCheck();
      if (!montado) return;
      setBackendCaido(!ok);
      if (!ok) temporizador = setTimeout(sondear, MS_REINTENTO_SALUD);
    };

    sondear();

    return () => {
      montado = false;
      clearTimeout(temporizador);
    };
  }, []);

  // ----------------------------------------------------------
  // Diagnostico derivado de las respuestas
  // ----------------------------------------------------------
  // Se recalcula en cada render en vez de guardarse en estado: es
  // una funcion pura y barata de tres numeros, y mantenerlo como
  // estado abriria la puerta a que se desincronice.
  //
  // Lo que se GUARDA en la base lo recalcula el servidor; esto es
  // solo para pintar.
  // ----------------------------------------------------------
  const puntaje =
    respuestas.q1_garantia + respuestas.q2_cartera_vencida + respuestas.q3_recuperacion;
  const completo = Object.values(respuestas).every((v) => v > 0);
  const nivel = completo ? nivelPorPuntaje(puntaje) : null;

  // Posicion del tiburon: mientras se responde avanza parcialmente;
  // con el diagnostico listo se ancla en la marca de su nivel.
  const mostrandoNivel = ['diagnostico', 'captura', 'enviando', 'resultado'].includes(vista);
  const posicionTiburon = mostrandoNivel && nivel ? nivel.ancla : posicionParcial(respuestas);

  // ----------------------------------------------------------
  const responder = (clave, valor) => {
    const siguientes = { ...respuestas, [clave]: valor };
    setRespuestas(siguientes);

    // Pausa breve para que se vea la opcion marcada y el tiburon
    // avanzar antes de cambiar de pantalla.
    setTimeout(() => {
      if (clave === 'q1_garantia') setVista('q2');
      else if (clave === 'q2_cartera_vencida') setVista('q3');
      else {
        setVista('calculando');
        setTimeout(() => setVista('diagnostico'), MS_CALCULO);
      }
    }, 420);
  };

  // ----------------------------------------------------------
  // Envio al backend
  // ----------------------------------------------------------
  // Funcion normal, sin useCallback: el proyecto tiene activado el
  // React Compiler, que memoriza por su cuenta. Envolverla a mano
  // no aportaba nada (no se pasa a ningun hijo memorizado) y ademas
  // chocaba con el analisis del compilador, que deducia dependencias
  // distintas a las declaradas.
  // ----------------------------------------------------------
  const enviar = async (datos) => {
      setDatosFormulario(datos);
      setErrorInfo(null);
      setVista('enviando');

      try {
        const respuesta = await registrarParticipante({
          ...datos,
          ...respuestas,
        });

        const objeto = {
          numeroRegistro: respuesta.numeroRegistro,
          esGanador: respuesta.esGanador,
          premio: respuesta.premio,
          // El del backend, no el del formulario: viene normalizado
          // y es identico al que quedo guardado en la base.
          nombreCompleto: respuesta.nombreCompleto,
          // El diagnostico se guarda para que la pantalla final lo
          // conserve al recargar. Como el envio por correo quedo
          // fuera de alcance, esto es lo unico que le queda a la
          // persona de su resultado.
          nivel: nivel?.clave ?? null,
          puntaje,
          fechaRegistro: new Date().toISOString(),
        };

        try {
          localStorage.setItem(LS_CLAVE, JSON.stringify(objeto));
        } catch {
          // Sin localStorage (incognito, cuota llena) el registro ya
          // quedo guardado en el servidor: no es critico.
        }

        setResultado(objeto);
        setVista('resultado');
      } catch (error) {
        if (error instanceof NetworkError) {
          setErrorInfo({ tipo: 'red', mensaje: error.message });
        } else if (error instanceof ApiError) {
          if (error.tipo === 'correo_duplicado') {
            setErrorInfo({
              tipo: 'correo_duplicado',
              mensaje:
                'Ese correo ya participó en la rifa. Si fuiste tú, no necesitas registrarte otra vez.',
            });
          } else if (error.tipo === 'rate_limit_exceeded') {
            setErrorInfo({
              tipo: 'rate_limit',
              mensaje:
                'Se han hecho demasiados intentos desde esta conexión. Espera unos minutos e intenta de nuevo.',
            });
          } else {
            setErrorInfo({
              tipo: 'generico',
              mensaje: error.campo
                ? `Hay un problema con el campo ${error.campo}: ${error.message}`
                : error.message,
            });
          }
        } else {
          setErrorInfo({ tipo: 'generico', mensaje: 'Ocurrió un error inesperado.' });
        }
        setVista('error');
      }
  };

  // ----------------------------------------------------------
  const reiniciar = () => {
    setRespuestas(RESPUESTAS_VACIAS);
    setDatosFormulario(null);
    setResultado(null);
    setErrorInfo(null);
    setVista('bienvenida');
  };

  const noSoyYo = () => {
    const ok = window.confirm(
      '¿Seguro que quieres borrar este registro y empezar de nuevo? No se puede deshacer en este dispositivo.'
    );
    if (!ok) return;
    localStorage.removeItem(LS_CLAVE);
    reiniciar();
  };

  // ----------------------------------------------------------
  // Que pantalla toca
  // ----------------------------------------------------------
  const pasoBarra = { q1: 1, q2: 2, q3: 3 }[vista] || 0;

  let contenido;
  switch (vista) {
    case 'bienvenida':
      contenido = <PantallaBienvenida onEmpezar={() => setVista('q1')} />;
      break;

    case 'q1':
    case 'q2':
    case 'q3': {
      const indice = Number(vista.slice(1)) - 1;
      const pregunta = PREGUNTAS[indice];
      contenido = (
        <PantallaPregunta
          pregunta={pregunta}
          numero={indice + 1}
          elegida={respuestas[pregunta.clave] || null}
          onElegir={(valor) => responder(pregunta.clave, valor)}
        />
      );
      break;
    }

    case 'calculando':
      contenido = <PantallaCargando mensaje="Calculando tu nivel de exposición…" />;
      break;

    case 'diagnostico':
      contenido = (
        <PantallaDiagnostico
          nivel={nivel}
          tuTiempo={PREGUNTAS[2].opciones[respuestas.q3_recuperacion - 1]}
          onContinuar={() => setVista('captura')}
        />
      );
      break;

    case 'captura':
      contenido = (
        <FormularioCaptura onEnviar={enviar} valoresIniciales={datosFormulario} />
      );
      break;

    case 'enviando':
      contenido = <PantallaCargando mensaje="Registrando tu participación…" />;
      break;

    case 'resultado':
      contenido = <PantallaResultado resultado={resultado} onNoSoyYo={noSoyYo} />;
      break;

    case 'error':
      contenido = (
        <PantallaError
          tipo={errorInfo?.tipo}
          mensaje={errorInfo?.mensaje}
          onReintentar={datosFormulario ? () => enviar(datosFormulario) : undefined}
          onEditar={() => setVista('captura')}
        />
      );
      break;

    default:
      contenido = null;
  }

  return (
    <Marco
      paso={pasoBarra}
      onReiniciar={vista === 'bienvenida' ? undefined : reiniciar}
      posicionTiburon={posicionTiburon}
      tiburonActivo={puntaje > 0}
      nivel={mostrandoNivel && nivel ? nivel.clave : null}
    >
      {/* Aviso si el backend no respondio al abrir */}
      {backendCaido && vista !== 'resultado' && (
        <div
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-zona-sharks/40
                     bg-zona-sharks/10 px-3.5 py-2.5 text-[12.5px] text-espuma"
          role="alert"
        >
          <span aria-hidden="true">⚠</span>
          <span>El servidor no responde. Puedes continuar, pero el registro podría fallar.</span>
        </div>
      )}

      {/*
        key por vista: React desmonta y remonta el bloque en cada
        cambio, lo que vuelve a disparar las animaciones de entrada.
        Sin esto solo se animarian en el primer montaje.
      */}
      <div key={vista} className="h-full">
        {contenido}
      </div>
    </Marco>
  );
}

export default App;
