const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
    "postcss-preset-env": {
      features: { "lab-function": false },
    },
  },
};

export default config;
