import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

let config = {};

// On Vercel: let Next.js handle Tailwind CSS natively (no PostCSS plugin needed)
// Changed CSS syntax from Tailwind v4 (@import "tailwindcss") to v3 (@tailwind directives)
// This avoids lightningcss native binding issues and lets Next.js's built-in Tailwind support work
if (isVercel) {
  config = { plugins: {} };
} else {
  // Local development: use @tailwindcss/postcss for full v4 features
  config = {
    plugins: {
      "@tailwindcss/postcss": {
        base: projectRoot,
      },
    },
  };
}

export default config;
