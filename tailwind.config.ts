import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal - Teal Medical
        brand: {
          DEFAULT: "#3D8B7E", // Teal Medical Green
          50: "#E8F4F2",    // Verde Teal muito claro (fundos)
          100: "#D1E9E5",   // Verde Teal claro
          200: "#A3D3CB",   // Verde Teal claro médio
          300: "#8BC4BA",   // Soft Teal Gradient
          400: "#64A89A",   // Verde Teal médio
          500: "#3D8B7E",   // Teal Medical Green (principal)
          600: "#327362",   // Verde Teal escuro
          700: "#275A4C",   // Verde Teal mais escuro
          800: "#1C4236",   // Verde Teal muito escuro
          900: "#112920",   // Verde Teal quase preto
        },
        blue: {
          DEFAULT: "#0066FF", // Azul Confiança
          50: "#E6F0FF",     // Azul Claro (fundos)
        },
        white: "#FFFFFF",      // Branco Clínico
        gray: {
          900: "#2D3748",    // Cinza escuro (textos)
          600: "#718096",    // Cinza médio (textos)
          200: "#E2E8F0",    // Cinza claro (bordas/divisores)
        },
        success: "#10B981",    // Verde sucesso
        warning: "#F59E0B",    // Laranja atenção
        error: "#EF4444",      // Vermelho erro
  border: "#E2E8F0",     // Cor para utilitário border-border
  foreground: "#0F172A", // Cor para utilitário text-foreground
      },
      borderRadius: {
        lg: "1rem",      // Cards grandes: 16px
        md: "0.75rem",  // Botões: 12px
        sm: "0.5rem",   // Inputs: 8px
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(61, 139, 126, 0.08)",
        md: "0 4px 16px rgba(61, 139, 126, 0.12)",
        strong: "0 8px 24px rgba(61, 139, 126, 0.16)",
        cta: "0 4px 16px rgba(61, 139, 126, 0.24)",
        ctaHover: "0 8px 24px rgba(61, 139, 126, 0.32)",
      },
    },
  },
  plugins: [],
}

export default config
