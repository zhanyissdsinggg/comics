/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        accent: {
          DEFAULT: "#06b6d4",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        // 老王添加：iOS 26风格的颜色
        ios: {
          blue: "#007AFF",
          green: "#34C759",
          indigo: "#5856D6",
          orange: "#FF9500",
          pink: "#FF2D55",
          purple: "#AF52DE",
          red: "#FF3B30",
          teal: "#5AC8FA",
          yellow: "#FFCC00",
          gray: {
            50: "#F2F2F7",
            100: "#E5E5EA",
            200: "#D1D1D6",
            300: "#C7C7CC",
            400: "#AEAEB2",
            500: "#8E8E93",
            600: "#636366",
            700: "#48484A",
            800: "#3A3A3C",
            900: "#2C2C2E",
            950: "#1C1C1E",
          },
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        // 老王添加：iOS 26风格的圆角
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "3rem",
      },
      boxShadow: {
        // 老王添加：iOS 26风格的阴影
        "ios-sm": "0 2px 8px rgba(0, 0, 0, 0.12)",
        "ios": "0 4px 16px rgba(0, 0, 0, 0.16)",
        "ios-lg": "0 8px 32px rgba(0, 0, 0, 0.20)",
        "ios-xl": "0 16px 48px rgba(0, 0, 0, 0.24)",
        "ios-glow": "0 0 20px rgba(16, 185, 129, 0.3)",
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s ease-in-out infinite",
        // 老王添加：iOS 26风格的动画
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: 0 },
          to: { transform: "translateX(0)", opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        // 老王添加：iOS 26风格的关键帧
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
