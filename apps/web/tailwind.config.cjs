/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}", // Next.js appディレクトリ対応
    "./components/**/*.{ts,tsx}", // コンポーネント
    "./src/**/*.{ts,tsx}", // src配下のファイル（utilsを含む）
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        Green: "#00873f",
        Emerald: "#249a84",
        DeepBlue: "#2C6994",
        "Emerald-dark": "#3f8b7d",
        Yellow: "#7b9237",
        Blue: "#426dd0",
        "light-Blue": "#2caaf3",
      },
    },
  },
  plugins: [],
};

module.exports = config;
