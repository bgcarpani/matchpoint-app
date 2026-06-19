import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Service worker generado por serwist (bundle minificado, no lintear).
    "public/sw.js",
    "public/swe-worker*",
    // Bundle del worker generado por OpenNext/Cloudflare (no lintear).
    ".open-next/**",
    // Artefactos temporales de wrangler (build/preview).
    ".wrangler/**",
    // Fuentes embebidas en base64 (generado por scripts/generate-og-fonts.mjs).
    "src/lib/og/fonts.generated.ts",
  ]),
]);

export default eslintConfig;
