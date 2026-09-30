import tailwindcssAnimate from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';

// Breakpoints de 01-SPECIFICATION.md §8.4: mobile e a base sem prefixo,
// os demais substituem a escala padrao do Tailwind (nao a estendem).
const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      md: '768px',
      lg: '1024px',
      xl: '1440px',
    },
    extend: {
      colors: {
        primaria: 'rgb(var(--cor-primaria) / <alpha-value>)',
        sucesso: 'rgb(var(--cor-sucesso) / <alpha-value>)',
        perigo: 'rgb(var(--cor-perigo) / <alpha-value>)',
        atencao: 'rgb(var(--cor-atencao) / <alpha-value>)',
        informacao: 'rgb(var(--cor-informacao) / <alpha-value>)',
        fundo: 'rgb(var(--cor-fundo) / <alpha-value>)',
        superficie: 'rgb(var(--cor-superficie) / <alpha-value>)',
        borda: 'rgb(var(--cor-borda) / <alpha-value>)',
        texto: 'rgb(var(--cor-texto) / <alpha-value>)',
        textoSuave: 'rgb(var(--cor-texto-suave) / <alpha-value>)',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
