import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

let config = {};

// Use @tailwindcss/postcss for both environments — it handles @import "tailwindcss" in v4
// lightningcss is optional; @tailwindcss/postcss gracefully degrades without it
config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
