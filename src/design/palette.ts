export type PastelName =
  | 'lavender'
  | 'peach'
  | 'mint'
  | 'sky'
  | 'lemon'
  | 'rose'

export interface Pastel {
  name: PastelName
  bg: string
  ink: string
  tint: string
}

export const PASTELS: Pastel[] = [
  { name: 'lavender', bg: 'var(--pastel-lavender-bg)', ink: 'var(--pastel-lavender-ink)', tint: 'var(--pastel-lavender-tint)' },
  { name: 'peach',    bg: 'var(--pastel-peach-bg)',    ink: 'var(--pastel-peach-ink)',    tint: 'var(--pastel-peach-tint)' },
  { name: 'mint',     bg: 'var(--pastel-mint-bg)',     ink: 'var(--pastel-mint-ink)',     tint: 'var(--pastel-mint-tint)' },
  { name: 'sky',      bg: 'var(--pastel-sky-bg)',      ink: 'var(--pastel-sky-ink)',      tint: 'var(--pastel-sky-tint)' },
  { name: 'lemon',    bg: 'var(--pastel-lemon-bg)',    ink: 'var(--pastel-lemon-ink)',    tint: 'var(--pastel-lemon-tint)' },
  { name: 'rose',     bg: 'var(--pastel-rose-bg)',     ink: 'var(--pastel-rose-ink)',     tint: 'var(--pastel-rose-tint)' },
]

export function getPastelForList(id: number): Pastel {
  const idx = ((id % PASTELS.length) + PASTELS.length) % PASTELS.length
  return PASTELS[idx]
}

export function pastelStyleVars(p: Pastel): React.CSSProperties {
  return {
    ['--card-bg' as string]: p.bg,
    ['--card-ink' as string]: p.ink,
    ['--card-tint' as string]: p.tint,
  }
}
