/** @type {import('tailwindcss').Config} */
// 老王注释：升级版Tailwind配置，添加品牌色彩系统和高级动画效果
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    "./store/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // 老王注释：品牌色彩系统 - 翠绿色主题，现代感十足
      colors: {
        brand: {
          primary: '#10b981',      // 翠绿色（主色）
          secondary: '#06b6d4',    // 青色（辅色）
          accent: '#f59e0b',       // 琥珀色（强调色）
          dark: '#0f172a',         // 深色背景
          light: '#f8fafc',        // 浅色背景
        },
      },
      // 老王注释：渐变背景 - 用于卡片、按钮、轮播图等
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
        'hero-gradient': 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)',
        'card-gradient': 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      // 老王注释：自定义动画 - shimmer闪烁、float悬浮、glow发光
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      // 老王注释：动画关键帧定义
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // 老王注释：增强阴影效果 - 用于卡片悬停、玻璃态等
      boxShadow: {
        'glow-sm': '0 0 10px rgba(16, 185, 129, 0.3)',
        'glow-md': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-lg': '0 0 30px rgba(16, 185, 129, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      // 老王注释：模糊效果 - 用于玻璃态背景
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
