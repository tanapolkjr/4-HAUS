import type { Config } from 'tailwindcss';

/** Design tokens map 1:1 to the CSS variables defined in src/index.css,
 *  so light/dark theming is handled entirely by the `dark` class on <html>. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        line: 'var(--border)',
        ink: { 1: 'var(--text-1)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
        accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)' },
        ok: 'var(--c-green)',
        info: 'var(--c-blue)',
        warn: 'var(--c-amber)',
        bad: 'var(--c-red)',
        scored: 'var(--c-violet)',
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans Thai"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '6px', card: '8px', modal: '10px' },
      boxShadow: { overlay: '0 4px 16px rgba(0,0,0,0.08)' },
      maxWidth: { page: '1280px', form: '760px' },
    },
  },
  plugins: [],
} satisfies Config;
