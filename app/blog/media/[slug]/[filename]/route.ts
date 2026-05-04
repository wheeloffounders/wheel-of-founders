import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

const CONTENT_BLOG = path.join(process.cwd(), 'content', 'blog')

function isSafeSegment(s: string): boolean {
  return /^[a-zA-Z0-9._ -]+$/.test(s) && !s.includes('..')
}

/**
 * Serves images stored next to MDX in `content/blog/` (e.g. `./photo.jpeg` in MDX → `/blog/media/:slug/:filename`).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; filename: string }> },
) {
  const { slug, filename } = await context.params
  let decodedFilename = filename
  try {
    decodedFilename = decodeURIComponent(filename)
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (!isSafeSegment(slug) || !isSafeSegment(decodedFilename)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const mdxPath = path.join(CONTENT_BLOG, `${slug}.mdx`)
  if (!fs.existsSync(mdxPath)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const filePath = path.join(CONTENT_BLOG, decodedFilename)
  const resolved = path.resolve(filePath)
  const base = path.resolve(CONTENT_BLOG)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return new NextResponse('Not Found', { status: 404 })
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const buf = fs.readFileSync(resolved)
  const ext = path.extname(decodedFilename).toLowerCase()
  const contentType =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'application/octet-stream'

  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
