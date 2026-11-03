/**
 * Set the owner password for /admin without the password or its hash passing through chat.
 *
 *   pnpm admin:set-password                 # prompt twice, push ADMIN_PASSWORD_HASH + ADMIN_SESSION_SECRET to Railway
 *   pnpm admin:set-password --local         # write both to .env.local instead
 *   pnpm admin:set-password --keep-session  # keep the existing ADMIN_SESSION_SECRET (sessions stay valid)
 *
 * Values are never printed. Railway variables are set with --skip-deploys; redeploy afterwards.
 * Changing the session secret signs out every admin session.
 */
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline"
import { Writable } from "node:stream"
import { hashPassword } from "../src/lib/admin/password"

const MIN_LENGTH = 14
const ENV_FILE = ".env.local"
const local = process.argv.includes("--local")
const keepSession = process.argv.includes("--keep-session")

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

/** Reads one line from the TTY with echo suppressed. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    let muted = false
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding)
        callback()
      },
    })
    const rl = createInterface({ input: process.stdin, output, terminal: true })
    let answered = false
    rl.on("close", () => {
      if (!answered) {
        process.stdout.write("\n")
        fail("Cancelled.")
      }
    })
    process.stdout.write(question)
    muted = true
    rl.question("", (answer) => {
      answered = true
      muted = false
      rl.close()
      process.stdout.write("\n")
      resolve(answer)
    })
  })
}

function setRailwayVar(key: string, value: string): void {
  const res = spawnSync("railway", ["variable", "set", key, "--stdin", "--service", "web", "--skip-deploys", "--json"], {
    input: value,
    encoding: "utf8",
  })
  if (res.error) fail(`Could not run the railway CLI: ${res.error.message}`)
  if (res.status !== 0) {
    fail(`railway variable set ${key} failed: ${(res.stderr || res.stdout || "").trim().slice(0, 300)}`)
  }
  console.log(`  set ${key} on Railway (service web)`)
}

function setLocalVars(vars: Record<string, string>): void {
  const original = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : ""
  const lines = original === "" ? [] : original.replace(/\n$/, "").split("\n")
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`
    const i = lines.findIndex((l) => l.startsWith(`${key}=`))
    if (i >= 0) lines[i] = line
    else lines.push(line)
    console.log(`  wrote ${key} to ${ENV_FILE}`)
  }
  writeFileSync(ENV_FILE, lines.join("\n") + "\n", { mode: 0o600 })
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY) fail("Run this in an interactive terminal: the password is read with echo off.")

  const first = await promptHidden("New admin password: ")
  if (first.length < MIN_LENGTH) fail(`Use at least ${MIN_LENGTH} characters.`)
  const second = await promptHidden("Repeat the password: ")
  if (first !== second) fail("The two entries do not match. Nothing was changed.")

  const vars: Record<string, string> = { ADMIN_PASSWORD_HASH: await hashPassword(first) }
  if (!keepSession) vars.ADMIN_SESSION_SECRET = randomBytes(48).toString("base64url")

  console.log(local ? `Writing to ${ENV_FILE}:` : "Pushing to Railway:")
  if (local) setLocalVars(vars)
  else for (const [key, value] of Object.entries(vars)) setRailwayVar(key, value)

  if (keepSession) {
    console.log("\nKept the existing ADMIN_SESSION_SECRET: current sessions stay signed in.")
    console.log("If none is set yet, admin stays disabled; run again without --keep-session.")
  } else {
    console.log("\nA new ADMIN_SESSION_SECRET was generated, so every existing admin session is signed out.")
  }
  console.log(
    local
      ? "Restart the dev server to pick up the change."
      : "Redeploy to apply it: railway redeploy --service web (or push a commit).",
  )
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "Failed.")
  process.exit(1)
})
