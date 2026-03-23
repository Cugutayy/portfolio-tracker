import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";
import ws from "ws";

// Enable WebSocket for serverless environments (needed for transactions + FOR UPDATE)
neonConfig.webSocketConstructor = ws;

let _db: NeonDatabase<typeof schema> | null = null;
let _pool: Pool | null = null;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Check your .env.local or Vercel environment variables.",
      );
    }
    _pool = new Pool({ connectionString: url });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

// Lazy proxy so the module can be imported at build time without DATABASE_URL
export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Database = NeonDatabase<typeof schema>;
