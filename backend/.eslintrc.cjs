module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  ignorePatterns: ["dist", "node_modules"],
  rules: {},
};
