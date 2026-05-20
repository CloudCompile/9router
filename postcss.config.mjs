import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: projectRoot,
    },
  },
};

// On Vercel, skip native lightningcss and use JS fallback
if (process.env.VERCEL) {
  process.env.LIGHTNINGCSS_SKIP = "1";
}

export default config;
