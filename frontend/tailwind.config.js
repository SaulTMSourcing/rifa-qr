/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // ----------------------------------------------------
      // Paleta: oceano profundo + naranja CLICK
      // ----------------------------------------------------
      // El tema es oscuro por decision del prototipo aprobado:
      // la dinamica es un "Tiburometro" y el fondo hace de agua,
      // con el naranja de marca como unico acento cromatico.
      //
      // El naranja NO viene del prototipo: se muestreo del PNG del
      // logo oficial (scripts/preparar-assets.mjs) y resulto
      // #f56f04. El prototipo traia #e8590c y la app anterior
      // #ff6b00; ninguno era el de marca.
      //
      // Los grises van del casi negro de superficie al negro de
      // fondo marino, para que el degradado del oceano lea como
      // profundidad y no como un simple fondo oscuro.
      // ----------------------------------------------------
      colors: {
        click: {
          orange: '#f56f04',
          'orange-hi': '#ff8c34',   // hover y brillos
          'orange-dim': '#c25703',  // presionado
          gray: '#54565a',          // gris de marca del logo
        },
        abismo: {
          900: '#050809',           // fondo marino
          800: '#0a0d10',           // lienzo
          700: '#121920',           // superficie de tarjeta
          600: '#1b242c',           // elementos elevados
          500: '#263039',           // bordes
        },
        espuma: '#f5f3ee',          // texto principal
        bruma: '#8a93a0',           // texto secundario
        bruma2: '#5a626c',          // texto terciario

        // Semaforo del Tiburometro
        zona: {
          safe: '#3fa772',
          turbias: '#e8b93c',
          abiertas: '#f56f04',
          sharks: '#d9432c',
        },
      },

      // ----------------------------------------------------
      // Tipografia
      // ----------------------------------------------------
      // Se conserva la del prototipo aprobado. La combinacion es
      // deliberada y encaja con el concepto de instrumento de
      // medicion: display geometrico para los titulares, mono
      // para etiquetas y cifras (se lee como lectura de sonar),
      // y una sans neutra para el cuerpo.
      // ----------------------------------------------------
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },

      // ----------------------------------------------------
      // Movimiento
      // ----------------------------------------------------
      keyframes: {
        // Entrada de pantalla: sube y aparece
        'entrar': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Cabeceo del tiburon al nadar
        'nadar': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%':      { transform: 'translateY(-5px) rotate(-1.2deg)' },
        },
        // Halo del objetivo al final de la escala
        'sonar': {
          '0%':   { transform: 'scale(.65)', opacity: '.85' },
          '100%': { transform: 'scale(1.75)', opacity: '0' },
        },
        // Latido del acento cuando algo exige atencion
        'pulso': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,111,4,.45)' },
          '50%':      { boxShadow: '0 0 0 18px rgba(245,111,4,0)' },
        },
        // Barrido de luz sobre el agua
        'corriente': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'girar': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'entrar':     'entrar .45s cubic-bezier(.22,.9,.3,1) both',
        'nadar':      'nadar 3.2s ease-in-out infinite',
        'sonar':      'sonar 2.4s ease-out infinite',
        'pulso':      'pulso 2.2s ease-in-out infinite',
        'corriente':  'corriente 9s linear infinite',
        'girar':      'girar 1s linear infinite',
      },
    },
  },
  plugins: [],
};
