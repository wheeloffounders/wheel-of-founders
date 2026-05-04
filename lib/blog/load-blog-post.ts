import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { BlogFrontmatter } from '@/lib/blog/types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

export function getBlogSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/i, ''))
}

export function loadBlogPostFile(slug: string): { raw: string; frontmatter: BlogFrontmatter } | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data } = matter(raw)
  const frontmatter = data as BlogFrontmatter
  if (!frontmatter?.title || !frontmatter?.description) return null
  return { raw, frontmatter }
}
