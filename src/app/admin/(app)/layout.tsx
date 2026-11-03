import { Suspense, type ReactNode } from "react"
import { Container } from "@/components/ui"
import { MICRO_CLASS } from "@/components/maison/primitives"
import { logout } from "../(auth)/login/actions"
import { AdminNav } from "./AdminNav"

/**
 * Static chrome only: it reads no cookies, so it prerenders. Pages read the session themselves
 * (requireAdmin) and stream in behind the Suspense boundary below, as the Next
 * authentication-with-cache-components guide describes.
 */
export default function AdminAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bone">
      <header className="border-b border-mist">
        <Container>
          <div className="flex h-20 items-center justify-between gap-6">
            <p className="font-display text-[1.125rem] font-medium uppercase tracking-[0.42em] text-ink">
              Avelune <span aria-hidden="true">·</span> Admin
            </p>
            <form action={logout}>
              <button
                type="submit"
                className={`${MICRO_CLASS} text-ink underline decoration-transparent decoration-1 underline-offset-[10px] transition-colors hover:decoration-ink`}
              >
                Sign out
              </button>
            </form>
          </div>
          <div className="pb-5">
            <AdminNav />
          </div>
        </Container>
      </header>
      <main id="main" className="py-12 lg:py-16">
        <Container>
          <Suspense fallback={<p className={`${MICRO_CLASS} text-stone`}>Loading</p>}>{children}</Suspense>
        </Container>
      </main>
    </div>
  )
}
