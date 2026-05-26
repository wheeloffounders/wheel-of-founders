export type InsightChapterRecord = {
  /** Query param key to reopen the period in its main page (e.g. `2026-02` or `2026-Q1`). */
  periodKey: string
  /** Human-readable label for the period (e.g. `Feb 2026`, `Q1 2026`). */
  periodLabel: string
  /** AI-derived title on Pro; fallback on Free. */
  themeTitle: string
  /** First few scannable lines shown on the card (Pro only). */
  highlights: string[]
  /** Remaining markdown shown inside expand control (Pro only). */
  bodyLog: string
}

/** Minimum unique body length before we show an expand control. */
export const INSIGHT_CHAPTER_BODY_MIN_CHARS = 48

