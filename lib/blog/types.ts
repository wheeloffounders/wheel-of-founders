export type BlogFaqItem = {
  question: string
  answer: string
}

export type BlogFrontmatter = {
  title: string
  /** Publish date (YYYY-MM-DD). Hidden from the blog index until this day (UTC). */
  date: string
  /** When true, post stays hidden even after `date`. */
  draft?: boolean
  description: string
  /** Optional image path, usually relative to the MDX file (e.g. ./cover.jpeg) */
  coverImage?: string
  /** Comma-separated or single string; split for keywords meta */
  keywords?: string
  /** Optional FAQ entries for JSON-LD (align with on-page FAQ when possible) */
  faqs?: BlogFaqItem[]
  /** Optional custom JSON-LD schema from frontmatter */
  schema?: Record<string, unknown>
}
