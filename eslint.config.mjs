// @ts-check Let TS check this config file

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["build/**", "dist/**", "node_modules/**", "scripts/"],
  },
  {
    files: ["**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      "no-restricted-globals": [
        "error",
        { message: "Use `Zotero.getMainWindow()` instead.", name: "window" },
        {
          message: "Use `Zotero.getMainWindow().document` instead.",
          name: "document",
        },
        {
          message: "Use `Zotero.getActiveZoteroPane()` instead.",
          name: "ZoteroPane",
        },
        "Zotero_Tabs",
      ],

      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": "allow-with-description",
          "ts-check": "allow-with-description",
        },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": [
        "off",
        {
          ignoreRestArgs: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // allow to use the `document` and `window` globals directly in CEs
    files: ["src/elements/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          message: "Use `Zotero.getActiveZoteroPane()` instead.",
          name: "ZoteroPane",
        },
        "Zotero_Tabs",
      ],
    },
  },
);
