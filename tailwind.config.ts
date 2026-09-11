import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta base "Mosaico" — ajustar a la identidad final de marca del hackathon.
        mosaico: {
          50: '#f2f7f5',
          100: '#e0ece6',
          500: '#1f7a5c',
          600: '#166348',
          900: '#0c3527',
        },
        // Rojo institucional Banorte — acento de marca para A2UI.
        banorte: {
          DEFAULT: '#EB0029',
          600: '#C40022',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
