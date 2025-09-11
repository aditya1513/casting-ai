module.exports = {
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: true
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": "error",
    "prefer-const": "error",
    "no-var": "error"
  },
  env: {
    es2022: true,
    node: true
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".turbo/",
    "*.config.js",
    "*.config.ts"
  ]
};
