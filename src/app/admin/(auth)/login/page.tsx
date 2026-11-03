import type { Metadata } from "next"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Micro, Wordmark } from "@/components/maison/primitives"
import { adminConfigured, isAdmin } from "@/lib/admin/auth"
import { safeNextPath } from "@/lib/admin/next-path"
import { LoginForm } from "./LoginForm"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const metadata: Metadata = { title: "Sign in" }

async function LoginBody({ searchParams }: { searchParams: SearchParams }) {
  // Env and cookies are per request; without a request-time API this would freeze at build time.
  await connection()
  if (!adminConfigured()) {
    return <p className="mt-12 font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">Admin is not set up yet.</p>
  }
  const raw = (await searchParams).next
  const next = safeNextPath(typeof raw === "string" ? raw : undefined)
  if (await isAdmin()) redirect(next)
  return <LoginForm next={next} />
}

export default function AdminLoginPage(props: { searchParams: SearchParams }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-bone px-4 py-20 sm:px-6">
      <p className="text-ink">
        <Wordmark />
      </p>
      <Micro className="mt-3">Admin</Micro>
      <Suspense fallback={null}>
        <LoginBody searchParams={props.searchParams} />
      </Suspense>
    </main>
  )
}
