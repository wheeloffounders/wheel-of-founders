import Link from 'next/link'
import type { Metadata } from 'next'
import { BlogIndexRadarLand } from '@/components/blog/BlogIndexRadarLand'
import { getBlogSlugs, loadBlogPostFile } from '@/lib/blog/load-blog-post'
import type { BlogFrontmatter } from '@/lib/blog/types'

export const metadata: Metadata = {
  title: 'Blog | Wheel of Founders',
  description:
    'Founder playbooks, operating rhythms, and how Mrs. Deer helps you run the business—and your mind—at a strategist pace.',
  openGraph: {
    title: 'Wheel of Founders Blog',
    description: 'Founder insights from Wheel of Founders and Mrs. Deer.',
    siteName: 'Wheel of Founders',
  },
}

function resolveBlogCover(slug: string, coverImage: string | undefined): string | undefined {
  if (!coverImage) return undefined
  if (coverImage.startsWith('./')) {
    return `/blog/media/${slug}/${encodeURIComponent(coverImage.slice(2))}`
  }
  return coverImage
}

export default function BlogIndexPage() {
  const slugs = getBlogSlugs()
  const posts = slugs
    .map((slug) => {
      const post = loadBlogPostFile(slug)
      return post ? { slug, ...post.frontmatter } : null
    })
    .filter(Boolean) as Array<{ slug: string } & BlogFrontmatter>

  return (
    <main className="mx-auto max-w-4xl py-12">
      <BlogIndexRadarLand />
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Blog</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          SEO, AEO, and GEO-friendly posts for founders building with Mrs. Deer.
        </p>
      </header>
      <ul className="space-y-8">
        {posts.map((p) => (
          <li key={p.slug}>
            <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40">
              {resolveBlogCover(p.slug, p.coverImage) ? (
                <Link href={`/blog/${p.slug}`} aria-label={p.title}>
                  <img
                    src={resolveBlogCover(p.slug, p.coverImage)}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </Link>
              ) : null}
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                  {p.date}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
                  <Link href={`/blog/${p.slug}`} className="hover:text-[#ef725c]">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p>
                <Link
                  href={`/blog/${p.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-[#ef725c] hover:underline"
                >
                  Read article →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {posts.length === 0 ? (
        <p className="mt-8 text-zinc-600 dark:text-zinc-400">No posts yet. Add MDX files under <code>content/blog/</code>.</p>
      ) : null}
    </main>
  )
}
