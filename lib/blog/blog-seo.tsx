import type { Metadata } from 'next'
import { getAppPublicOrigin } from '@/lib/app-public-url'
import type { BlogFrontmatter } from '@/lib/blog/types'

function keywordsToArray(keywords: string | undefined): string[] {
  if (!keywords?.trim()) return []
  return keywords
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function buildBlogArticleMetadata(args: {
  slug: string
  frontmatter: BlogFrontmatter
}): Metadata {
  const base = getAppPublicOrigin()
  const url = `${base}/blog/${args.slug}`
  const kw = keywordsToArray(args.frontmatter.keywords)

  return {
    title: `${args.frontmatter.title} | Wheel of Founders`,
    description: args.frontmatter.description,
    keywords: kw.length ? kw : undefined,
    authors: [{ name: 'Wheel of Founders', url: base }],
    alternates: { canonical: url },
    openGraph: {
      title: args.frontmatter.title,
      description: args.frontmatter.description,
      type: 'article',
      publishedTime: args.frontmatter.date,
      url,
      siteName: 'Wheel of Founders',
    },
    twitter: {
      card: 'summary_large_image',
      title: args.frontmatter.title,
      description: args.frontmatter.description,
    },
    robots: { index: true, follow: true },
  }
}

type JsonLdGraphProps = {
  slug: string
  frontmatter: BlogFrontmatter
}

/**
 * JSON-LD: Organization + Article (+ FAQPage when `frontmatter.faqs` is set) for Google & answer engines.
 */
export function BlogArticleJsonLd({ slug, frontmatter }: JsonLdGraphProps) {
  const base = getAppPublicOrigin()
  const url = `${base}/blog/${slug}`

  const organization = {
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: 'Wheel of Founders',
    url: base,
    description:
      'Daily founder coaching with Mrs. Deer — morning planning, evening reflection, and a strategist pace for busy founders.',
  }

  const article = {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.date,
    author: { '@type': 'Organization', name: 'Wheel of Founders' },
    publisher: { '@type': 'Organization', name: 'Wheel of Founders', url: base },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    keywords: keywordsToArray(frontmatter.keywords).join(', ') || undefined,
    isPartOf: { '@id': `${base}/#organization` },
  }

  const graph: Record<string, unknown>[] = [organization, article]

  if (Array.isArray(frontmatter.faqs) && frontmatter.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: frontmatter.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
  }

  const payload = { '@context': 'https://schema.org', '@graph': graph }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
      />
      {frontmatter.schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(frontmatter.schema) }}
        />
      ) : null}
    </>
  )
}
