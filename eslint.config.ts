import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "**/dist/**",
      "**/.astro/**",
      "**/.vercel/**",
      "**/.output/**",
      "**/node_modules/**",
    ],
  },

  tseslint.configs.recommended,

  {
    files: ["**/*.{ts,js,mjs,cjs}"],
    languageOptions: {
      globals: globals["shared-node-browser"],
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-this-alias": "off",
    },
  },
]);
