import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

let config = {};

// On Vercel, use minimal CSS processing to avoid native modules
if (isVercel) {
  // Use standard postcss without tailwindcss/postcss (which requires lightningcss)
  // Tailwind CSS will still work via its default processing
  config = {
    plugins: {},
  };
} else {
  // Local development: use full tailwindcss with optimizations
  config = {
    plugins: {
      "@tailwindcss/postcss": {
        base: projectRoot,
      },
    },
  };
}

export default config;
