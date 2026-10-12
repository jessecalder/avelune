import { config } from "dotenv"
import { csvCell } from "../src/lib/signups/csv"

config({ path: ".env.local" })
config()

const COLUMNS = [
  "createdAt",
  "email",
  "name",
  "childrenCount",
  "childrenAges",
  "destinations",
  "source",
  "referrer",
  "status",
  "notes",
] as const

async function main() {
  const { getStore } = await import("../src/lib/signups/store")
  const rows = await getStore().list()
  const lines = [COLUMNS.join(",")]
  for (const r of rows) {
    lines.push(
      [
        r.createdAt,
        r.email,
        r.name,
        r.childrenCount,
        r.childrenAges,
        r.destinations?.join("|"),
        r.source,
        r.referrer,
        r.status,
        r.notes,
      ]
        .map(csvCell)
        .join(","),
    )
  }
  process.stdout.write(lines.join("\r\n") + "\r\n")
  if (process.env.DATABASE_URL) {
    const { closeDb } = await import("../src/db/client")
    await closeDb()
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err)
    process.exit(1)
  },
)
