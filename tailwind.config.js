/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976D2',
          dark: '#1565C0',
          light: '#42A5F5',
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        dark: {
          DEFAULT: '#0A1628',
          800: '#0F1E35',
          700: '#162847',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 16px rgba(0,0,0,0.07)',
        'card-hover': '0 12px 40px rgba(25,118,210,0.20)',
        'soft': '0 4px 24px rgba(0,0,0,0.08)',
        'glow': '0 0 30px rgba(25,118,210,0.30)',
        'glow-sm': '0 0 15px rgba(25,118,210,0.20)',
        'hero': '0 24px 80px rgba(0,0,0,0.4)',
        'input-focus': '0 0 0 3px rgba(25,118,210,0.15)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0D47A1 0%, #1565C0 40%, #1976D2 70%, #1E88E5 100%)',
        'card-gradient': 'linear-gradient(135deg, #E3F2FD 0%, #ffffff 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shine': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
        'mesh': 'radial-gradient(at 40% 20%, hsla(210,100%,56%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.10) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.05) 0px, transparent 50%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.55s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-right': 'slideRight 0.45s ease-out both',
        'slide-left': 'slideLeft 0.45s ease-out both',
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'shimmer': 'shimmer 2.2s linear infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 2.5s ease-in-out infinite',
        'spin-slow': 'spin 10s linear infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-14px) rotate(1deg)' },
          '66%': { transform: 'translateY(-8px) rotate(-1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.04)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
