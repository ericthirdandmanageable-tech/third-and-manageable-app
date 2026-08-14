/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        raleway: ["Raleway-Regular"],
        "raleway-medium": ["Raleway-Medium"],
        "raleway-semibold": ["Raleway-SemiBold"],
        "raleway-bold": ["Raleway-Bold"],
        "raleway-extrabold": ["Raleway-ExtraBold"],
      },
      colors: {
        "app-surface":
          "rgba(var(--color-app-surface), var(--color-app-surface-alpha))",
        dp: {
          50: "rgb(var(--color-dp-50) / <alpha-value>)",
          100: "rgb(var(--color-dp-100) / <alpha-value>)",
          200: "rgb(var(--color-dp-200) / <alpha-value>)",
          300: "rgb(var(--color-dp-300) / <alpha-value>)",
          400: "rgb(var(--color-dp-400) / <alpha-value>)",
          500: "rgb(var(--color-dp-500) / <alpha-value>)",
          600: "rgb(var(--color-dp-600) / <alpha-value>)",
          700: "rgb(var(--color-dp-700) / <alpha-value>)",
          800: "rgb(var(--color-dp-800) / <alpha-value>)",
          900: "rgb(var(--color-dp-900) / <alpha-value>)",
        },
        silver: {
          50: "rgb(var(--color-silver-50) / <alpha-value>)",
          100: "rgb(var(--color-silver-100) / <alpha-value>)",
          200: "rgb(var(--color-silver-200) / <alpha-value>)",
          300: "rgb(var(--color-silver-300) / <alpha-value>)",
          400: "rgb(var(--color-silver-400) / <alpha-value>)",
          500: "rgb(var(--color-silver-500) / <alpha-value>)",
          600: "rgb(var(--color-silver-600) / <alpha-value>)",
          700: "rgb(var(--color-silver-700) / <alpha-value>)",
          800: "rgb(var(--color-silver-800) / <alpha-value>)",
          900: "rgb(var(--color-silver-900) / <alpha-value>)",
        },
        cream: "rgb(var(--color-cream) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
