import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Lora } from 'next/font/google'
import type { ImgHTMLAttributes } from 'react'
import { compileMDX } from 'next-mdx-remote/rsc'
import { BlogCTA } from '@/components/blog/BlogCTA'
import { InteractiveTemplate } from '@/components/blog/InteractiveTemplate'
import { DecisionParserWidget } from '@/components/DecisionParserWidget'
import { BlogArticleJsonLd, buildBlogArticleMetadata } from '@/lib/blog/blog-seo'
import { getBlogSlugs, loadBlogPostFile } from '@/lib/blog/load-blog-post'
import type { BlogFrontmatter } from '@/lib/blog/types'

function blogMdxImg(slug: string) {
  return function BlogMdxImg(props: ImgHTMLAttributes<HTMLImageElement>) {
    const raw = props.src
    const src =
      typeof raw === 'string' && raw.startsWith('./')
        ? `/blog/media/${slug}/${encodeURIComponent(raw.slice(2))}`
        : raw
    return <img {...props} src={src} alt={props.alt ?? ''} />
  }
}

/** Serif for headings — “published” journal feel (HBR-style). */
const blogHeadings = Lora({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-blog-heading',
  display: 'swap',
})

export async function generateStaticParams() {
  return getBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const file = loadBlogPostFile(slug)
  if (!file) return { title: 'Post not found | Wheel of Founders' }
  return buildBlogArticleMetadata({ slug, frontmatter: file.frontmatter })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const file = loadBlogPostFile(slug)
  if (!file) notFound()

  const { content } = await compileMDX<BlogFrontmatter>({
    source: file.raw,
    components: { BlogCTA, InteractiveTemplate, DecisionParserWidget, img: blogMdxImg(slug) },
    options: { parseFrontmatter: true },
  })

  return (
    <>
      <BlogArticleJsonLd slug={slug} frontmatter={file.frontmatter} />
      <article
        className={[
          blogHeadings.variable,
          'mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6 md:pt-8',
          'blog-premium font-sans text-lg leading-relaxed tracking-normal text-zinc-800 antialiased dark:text-zinc-200',
          '[&_h1]:[font-family:var(--font-blog-heading),Georgia,Cambria,serif] [&_h1]:mt-2 [&_h1]:scroll-mt-24 [&_h1]:font-semibold [&_h1]:tracking-tight',
          '[&_h1]:text-[1.875rem] [&_h1]:leading-tight sm:[&_h1]:text-[2.25rem]',
          '[&_h1]:text-zinc-950 dark:[&_h1]:text-white',
          '[&_h2]:[font-family:var(--font-blog-heading),Georgia,Cambria,serif] [&_h2]:mt-16 [&_h2]:mb-4 [&_h2]:scroll-mt-24 [&_h2]:border-b [&_h2]:border-zinc-200/80 [&_h2]:pb-2',
          '[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-zinc-950 dark:[&_h2]:border-zinc-700/80 dark:[&_h2]:text-white',
          '[&_h3]:[font-family:var(--font-blog-heading),Georgia,Cambria,serif] [&_h3]:mt-12 [&_h3]:mb-3 [&_h3]:scroll-mt-24 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-50',
          '[&_p]:my-5 [&_p]:text-pretty',
          '[&_strong]:font-semibold [&_strong]:text-zinc-950 dark:[&_strong]:text-white',
          '[&_blockquote]:my-8 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-[6px] [&_blockquote]:border-[#ef725c]',
          '[&_blockquote]:bg-zinc-100/90 [&_blockquote]:px-5 [&_blockquote]:py-5 dark:[&_blockquote]:bg-zinc-900/55',
          '[&_blockquote]:italic [&_blockquote]:text-zinc-800 dark:[&_blockquote]:text-zinc-200',
          '[&_ul]:my-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-8 [&_ul]:marker:text-zinc-400',
          '[&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-8 [&_ol]:marker:font-medium [&_ol]:marker:text-zinc-500',
          '[&_li]:my-0 [&_li]:pl-1 [&_li]:leading-relaxed',
          '[&_a]:font-medium [&_a]:text-[#ef725c] [&_a]:underline-offset-2 hover:[&_a]:underline',
          '[&_img]:my-8 [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-zinc-200/80 [&_img]:shadow-sm dark:[&_img]:border-zinc-700/80',
        ].join(' ')}
      >
        {content}
      </article>
    </>
  )
}
