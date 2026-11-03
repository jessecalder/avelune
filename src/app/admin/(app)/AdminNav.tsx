"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MICRO_CLASS } from "@/components/maison/primitives"

export const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/signups", label: "Early access" },
  { href: "/admin/families", label: "Families" },
  { href: "/admin/trips", label: "Trips" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/deposits", label: "Deposits" },
] as const

/** The nav links; `pathname` marks the current section (null while it is not known yet). */
export function AdminNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin" className="-mx-1 flex flex-wrap gap-x-6 gap-y-1">
      {ADMIN_LINKS.map((link) => {
        const current =
          pathname !== null && (link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href))
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`${MICRO_CLASS} px-1 text-ink underline decoration-1 underline-offset-[10px] transition-colors ${
              current ? "decoration-ink" : "decoration-transparent hover:decoration-ink/60"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * usePathname() is request data on dynamic routes under cacheComponents, so the layout renders
 * this inside <Suspense> with <AdminNavLinks pathname={null} /> as the fallback.
 */
export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />
}
