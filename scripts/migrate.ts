import { config } from "dotenv"
import { migrate } from "drizzle-orm/postgres-js/migrator"

config({ path: ".env.local" })
config()

async function main() {
  // Imported after env is loaded; client.ts reads DATABASE_URL lazily anyway.
  const { closeDb, getDb } = await import("../src/db/client")
  try {
    await migrate(getDb(), { migrationsFolder: "./drizzle" })
    console.log("migrated")
  } finally {
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
