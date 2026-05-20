import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// On Vercel, skip lightningcss entirely to avoid native binding issues
const isVercel = process.env.VERCEL === "1" || process.env.CI === "true";

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: projectRoot,
      ...(isVercel && { corePlugins: { optimizeUniversalDefaults: false } }),
    },
  },
};

// Prevent lightningcss from being loaded
if (isVercel) {
  process.env.LIGHTNINGCSS_SKIP = "1";
  process.env.NO_COLOR = "1";
}

export default config;
