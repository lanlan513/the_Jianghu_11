/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        ink: {
          50: '#f8f6f2',
          100: '#f5f0e6',
          200: '#e8e0d0',
          300: '#d4c9b0',
          400: '#b8a98a',
          500: '#9c8b6a',
          600: '#8b8680',
          700: '#5c5854',
          800: '#2d3a4a',
          900: '#1a1a1a',
          950: '#0d0d0d',
        },
        cinnabar: {
          50: '#fef2f3',
          100: '#fde2e4',
          200: '#fbc7cc',
          300: '#f7a1a8',
          400: '#f06c78',
          500: '#e44556',
          600: '#c41e3a',
          700: '#a51830',
          800: '#88172b',
          900: '#731829',
        },
        bronze: {
          50: '#f1f5ef',
          100: '#dfe8da',
          200: '#c2d1ba',
          300: '#9bb48f',
          400: '#749468',
          500: '#4a6741',
          600: '#3d5536',
          700: '#33442e',
          800: '#2b3728',
          900: '#242e22',
        },
        gold: {
          50: '#fbf7e9',
          100: '#f5edc9',
          200: '#ecd991',
          300: '#e2c056',
          400: '#d4af37',
          500: '#b99423',
          600: '#99751d',
          700: '#7c5a1c',
          800: '#684a1f',
          900: '#5a3f20',
        },
      },
      fontFamily: {
        'brush': ['"Ma Shan Zheng"', '"ZCOOL KuaiLe"', 'cursive'],
        'serif-cn': ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        'song': ['"Noto Serif SC"', 'SimSun', 'serif'],
      },
      backgroundImage: {
        'ink-paper': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
        'ink-wash': 'linear-gradient(135deg, rgba(26,26,26,0.02) 0%, rgba(245,240,230,0.8) 50%, rgba(26,26,26,0.03) 100%)',
        'scroll-gradient': 'linear-gradient(180deg, rgba(245,240,230,0) 0%, rgba(245,240,230,1) 5%, rgba(245,240,230,1) 95%, rgba(245,240,230,0) 100%)',
      },
      boxShadow: {
        'ink': '0 4px 20px rgba(26, 26, 26, 0.1)',
        'ink-hover': '0 8px 30px rgba(26, 26, 26, 0.15)',
        'brush': '0 2px 10px rgba(196, 30, 58, 0.2)',
        'gold': '0 2px 15px rgba(212, 175, 55, 0.3)',
      },
      animation: {
        'scroll-unfold': 'scrollUnfold 1.2s ease-out forwards',
        'ink-spread': 'inkSpread 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'sword-glow': 'swordGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        scrollUnfold: {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'top' },
        },
        inkSpread: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { opacity: '0.8' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        swordGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(212, 175, 55, 0.7)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
