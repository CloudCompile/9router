import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

let config = {};

if (isVercel) {
  // On Vercel: use tailwindcss (v4) directly without @tailwindcss/postcss plugin
  // Next.js v16+ has built-in Tailwind support that doesn't need the plugin
  config = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
} else {
  // Local development: use full @tailwindcss/postcss which includes lightningcss
  config = {
    plugins: {
      "@tailwindcss/postcss": {
        base: projectRoot,
      },
    },
  };
}

export default config;
