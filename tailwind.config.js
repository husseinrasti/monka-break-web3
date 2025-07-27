/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // MonkaBreak Custom Colors
        primary: {
          DEFAULT: "#836EF9", // vibrant purple
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#200052", // deep purple-black
          foreground: "#FBFAF9",
        },
        accent: {
          DEFAULT: "#A0055D", // danger/warning color
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#0E100F", // dark grey
          foreground: "#FBFAF9",
        },
        destructive: {
          DEFAULT: "#A0055D",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#200052",
          foreground: "#FBFAF9",
        },
        popover: {
          DEFAULT: "#200052",
          foreground: "#FBFAF9",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 