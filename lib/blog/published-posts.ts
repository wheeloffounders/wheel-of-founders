import { getBlogSlugs, loadBlogPostFile } from '@/lib/blog/load-blog-post'
import type { BlogFrontmatter } from '@/lib/blog/types'

/** Calendar day in UTC from `YYYY-MM-DD` frontmatter. */
export function parseBlogPublishDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return new Date(Date.UTC(year, month - 1, day))
}

/** Start of today in UTC — posts publish at 00:00 UTC on their `date`. */
function startOfTodayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function isBlogPostPublished(frontmatter: BlogFrontmatter, now = new Date()): boolean {
  if (frontmatter.draft) return false
  if (!frontmatter.date) return true
  const publishOn = parseBlogPublishDate(frontmatter.date)
  if (!publishOn) return true
  return publishOn.getTime() <= startOfTodayUtc(now).getTime()
}

export type PublishedBlogPost = { slug: string; frontmatter: BlogFrontmatter }

export function getPublishedBlogPosts(now = new Date()): PublishedBlogPost[] {
  return getBlogSlugs()
    .map((slug) => {
      const file = loadBlogPostFile(slug)
      if (!file || !isBlogPostPublished(file.frontmatter, now)) return null
      return { slug, frontmatter: file.frontmatter }
    })
    .filter(Boolean) as PublishedBlogPost[]
}

export function getPublishedBlogSlugs(now = new Date()): string[] {
  return getPublishedBlogPosts(now).map((p) => p.slug)
}

export function sortBlogPostsByDateDesc(posts: PublishedBlogPost[]): PublishedBlogPost[] {
  return [...posts].sort((a, b) => {
    const aTime = parseBlogPublishDate(a.frontmatter.date)?.getTime() ?? 0
    const bTime = parseBlogPublishDate(b.frontmatter.date)?.getTime() ?? 0
    return bTime - aTime || a.slug.localeCompare(b.slug)
  })
}
