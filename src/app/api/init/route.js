import { ensureSchema } from "@/db/migrate.js";

let initialized = false;

export async function GET() {
  if (!initialized) {
    await ensureSchema();
    initialized = true;
  }
  return new Response("OK", { status: 200 });
}
