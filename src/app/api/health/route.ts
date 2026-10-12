import { connection } from "next/server"
import pkg from "../../../../package.json"
import { depositsEnabled } from "@/lib/deposits/config"

export async function GET() {
  // Excludes this handler from prerendering so `time` is per request.
  await connection()
  return Response.json({
    ok: true,
    store: process.env.DATABASE_URL ? "postgres" : "file",
    deposits: depositsEnabled(),
    version: pkg.version,
    time: new Date().toISOString(),
  })
}
