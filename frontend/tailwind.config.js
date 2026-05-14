/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // ----------------------------------------------------
      // Paleta CLICK Seguridad Juridica
      // ----------------------------------------------------
      // Se usan asi en clases de Tailwind:
      //   bg-click-orange        -> #ff6b00
      //   text-click-gray        -> #54565a
      //   bg-click-orange-dark   -> #cc5500 (hover)
      //   bg-click-orange-light  -> #fff4eb (fondos suaves)
      //   text-winner            -> #fbbf24 (dorado, solo ganadores)
      // ----------------------------------------------------
      colors: {
        click: {
          orange: '#ff6b00',
          'orange-dark': '#cc5500',
          'orange-light': '#fff4eb',
          gray: '#54565a',
          'gray-light': '#f3f4f6',
        },
        winner: {
          DEFAULT: '#fbbf24',
          dark: '#d97706',
          light: '#fef3c7',
        },
        success: '#10b981',
        danger: '#dc2626',
        ink: '#1a1a1a',
      },

      // ----------------------------------------------------
      // Tipografia
      // ----------------------------------------------------
      // Inter como principal. El fallback (-apple-system, etc.)
      // garantiza que si Google Fonts no carga, se ve aceptable.
      // ----------------------------------------------------
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },

      // ----------------------------------------------------
      // Animaciones personalizadas
      // ----------------------------------------------------
      // Las usamos en la pantalla del ganador para reforzar
      // la sensacion celebratoria.
      // ----------------------------------------------------
      keyframes: {
        'bounce-in': {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '50%':  { transform: 'scale(1.05)', opacity: '1' },
          '70%':  { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-orange': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 0, 0.4)' },
          '50%':      { boxShadow: '0 0 0 20px rgba(255, 107, 0, 0)' },
        },
      },
      animation: {
        'bounce-in':    'bounce-in 0.6s ease-out',
        'fade-up':      'fade-up 0.4s ease-out',
        'pulse-orange': 'pulse-orange 2s infinite',
      },
    },
  },
  plugins: [],
};
