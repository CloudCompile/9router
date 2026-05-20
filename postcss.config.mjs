import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

let config = {};

// Use @tailwindcss/postcss everywhere — lightningcss is a real dep (not omit=optional)
config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
