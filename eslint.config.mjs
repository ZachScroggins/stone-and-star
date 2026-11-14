import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  // Tailwind: the same canonical-class check as the editor's Tailwind extension
  // (suggestCanonicalClasses), e.g. `sm:top-[4.5rem]` -> `sm:top-18`. Autofixed by
  // `npm run format`. Class order stays with prettier-plugin-tailwindcss.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: {
      'better-tailwindcss': { entryPoint: 'app/globals.css', rootFontSize: 16 },
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error',
      // Merging two classes into one (`text-sm leading-relaxed` -> `text-sm/relaxed`) leaves a gap.
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
    },
  },
]);

export default eslintConfig;
