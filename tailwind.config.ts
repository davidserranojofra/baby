import type { Config } from 'tailwindcss'

export default <Config>{
  darkMode: 'class',
  content: [
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './layouts/**/*.{vue,js,ts,jsx,tsx}',
    './pages/**/*.{vue,js,ts,jsx,tsx}',
    './plugins/**/*.{vue,js,ts,jsx,tsx}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        borderSubtle: 'var(--border-color)',
        
        primaryText: 'var(--text-primary)',
        secondaryText: 'var(--text-secondary)',
        mutedText: 'var(--text-muted)',

        breastLeft: {
          DEFAULT: 'var(--breast-left)',
          soft: 'var(--breast-left-soft)',
          border: 'var(--breast-left-border)'
        },
        breastRight: {
          DEFAULT: 'var(--breast-right)',
          soft: 'var(--breast-right-soft)',
          border: 'var(--breast-right-border)'
        },
        bottle: {
          DEFAULT: 'var(--bottle)',
          soft: 'var(--bottle-soft)',
          border: 'var(--bottle-border)'
        },
        meds: {
          DEFAULT: 'var(--meds-accent)',
          soft: 'var(--meds-soft)',
          border: 'var(--meds-border)'
        },
        warningSoft: {
          DEFAULT: 'var(--warning-accent)',
          soft: 'var(--warning-soft)',
          border: 'var(--warning-border)'
        }
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-md': '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 16px 32px -6px rgba(0, 0, 0, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    },
  },
  plugins: [],
}
