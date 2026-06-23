/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bio: {
          black: "#050505",
          dark: "#0b0e0c",
          "dark-green": "#061a0e",
          "forest": "#0b2b18",
          "emerald": "#10b981",
          "light-emerald": "#34d399",
          "glow-green": "#00ff66",
          "card-bg": "rgba(10, 25, 15, 0.4)",
          "card-border": "rgba(16, 185, 129, 0.15)",
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-medium': 'float 5s ease-in-out infinite',
        'float-leaf': 'floatLeaf 12s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        floatLeaf: {
          '0%': { transform: 'translateY(-10%) translateX(0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(110%) translateX(100px) rotate(360deg)', opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 0.5)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
        'neon-glow': '0 0 30px rgba(0, 255, 102, 0.25)',
      },
      backdropBlur: {
        'glass': '12px',
      }
    },
  },
  plugins: [],
}
