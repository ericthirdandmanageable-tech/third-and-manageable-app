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
        dp: {
          50: "#ECEEFB",
          100: "#D0D4F5",
          200: "#A1A8EB",
          300: "#6E78D9",
          400: "#3940C9",
          500: "#0618A8",
          600: "#040485",
          700: "#030366",
          800: "#020247",
          900: "#01012E",
        },
        silver: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EEEEEE",
          300: "#E0E0E0",
          400: "#BDBDBD",
          500: "#9E9E9E",
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
        },
        cream: "#FAF8F5",
      },
    },
  },
  plugins: [],
};
