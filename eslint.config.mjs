import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Spacing and type come from the token scale (plan section 12): no arbitrary px values such as `p-[12px]`.
    // shadcn primitives in components/ui are generated and keep their upstream values.
    files: ["**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: { "better-tailwindcss": { entryPoint: "app/globals.css" } },
    rules: {
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: "^.*\\[[^\\]]*\\d(?:\\.\\d+)?px.*$",
              message: 'Arbitrary px value in "$0": use a token from the spacing/type scale (plan section 12).',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-*/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".claude/**",
    ],
  },
];

export default eslintConfig;
