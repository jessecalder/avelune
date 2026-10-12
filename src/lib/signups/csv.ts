/**
 * RFC-4180 quoting plus spreadsheet formula neutralisation: cells that begin
 * with = + - @ tab or CR are evaluated as formulas by Excel/Numbers/Sheets,
 * even when quoted, so they get a leading apostrophe.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let s = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
