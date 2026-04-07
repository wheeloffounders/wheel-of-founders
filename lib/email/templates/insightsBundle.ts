import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export type InsightsBundlePart = {
  key: 'weekly' | 'monthly' | 'quarterly'
  heading: string
  preview: string
  ctaLabel: string
  ctaPath: string
  utmCampaign: string
}

function openingLine(keys: Set<string>): string {
  if (keys.has('weekly') && keys.has('monthly') && keys.has('quarterly')) {
    return 'Something rare aligned — your weekly rhythm, monthly lens, and quarterly arc are all ready at once.'
  }
  if (keys.has('weekly') && keys.has('monthly')) {
    return 'This week, something aligned. Both your weekly rhythm and your monthly view are ready at the same time.'
  }
  if (keys.has('weekly') && keys.has('quarterly')) {
    return 'This week lines up with a bigger arc — your weekly insight and quarterly trajectory are both ready.'
  }
  if (keys.has('monthly') && keys.has('quarterly')) {
    return 'The month and the quarter turned together — both reads are ready for you.'
  }
  return 'Mrs. Deer has more than one lens ready for you today.'
}

function subjectFragment(key: string): string {
  if (key === 'weekly') return 'weekly insight'
  if (key === 'monthly') return 'monthly insight'
  return 'quarterly insight'
}

function subjectLine(user: { name?: string | null; email?: string | null }, parts: InsightsBundlePart[]): string {
  const name = emailSubjectGreetingFromUser(user)
  if (parts.length === 1) {
    const p = parts[0]!
    const emoji = p.key === 'weekly' ? '📊' : p.key === 'monthly' ? '🌙' : '📈'
    return `${emoji} ${name}, your ${subjectFragment(p.key)} is ready`
  }
  const w = parts.map((p) => p.key)
  if (w.length === 2) return `${name}, your ${w[0]} + ${w[1]} insights are ready`
  return `${name}, your ${w[0]}, ${w[1]}, and ${w[2]} insights are ready`
}

function stripMarkdownForPreview(s: string, maxLen: number): string {
  const flat = s
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (flat.length <= maxLen) return flat
  return `${flat.slice(0, maxLen).trim()}…`
}

export const insightsBundleTemplate: EmailTemplate = {
  getSubject: (user, data) => {
    const parts = (data?.insightsBundleParts as InsightsBundlePart[] | undefined) ?? []
    return subjectLine(user, parts)
  },
  getHtml: (user, data) => {
    const parts = (data?.insightsBundleParts as InsightsBundlePart[] | undefined) ?? []
    const keys = new Set(parts.map((p) => p.key))
    const open = openingLine(keys)
    const blocks = parts
      .map((p) => {
        const prev = p.preview ? stripMarkdownForPreview(p.preview, 520) : ''
        const url = appUrlWithUtm(p.ctaPath, p.utmCampaign)
        return `<h3 style="color:#0f172a;margin:20px 0 8px 0;font-size:16px;">${p.heading}</h3>
        ${prev ? `<blockquote style="margin:0 0 12px 0;padding:12px;border-left:4px solid #ef725c;background:#fff5f3;">${prev}</blockquote>` : ''}
        <p style="margin:0 0 8px 0;"><a href="${url}" style="color:#ef725c;font-weight:600;">${p.ctaLabel}</a></p>`
      })
      .join('')
    return renderEmailLayout({
      user,
      title: 'Your insights are ready',
      bodyHtml: `<p style="font-style:italic;color:#334155;">${open}</p>
      ${blocks}
      <p style="margin-top:20px;color:#64748b;font-size:14px;">— Mrs. Deer</p>`,
    })
  },
  getText: (user, data) => {
    const parts = (data?.insightsBundleParts as InsightsBundlePart[] | undefined) ?? []
    const keys = new Set(parts.map((p) => p.key))
    let out = `${openingLine(keys)}\n\n`
    for (const p of parts) {
      const prev = p.preview ? stripMarkdownForPreview(p.preview, 400) : ''
      out += `${p.heading}\n${prev ? `${prev}\n` : ''}${appUrlWithUtm(p.ctaPath, p.utmCampaign)}\n\n`
    }
    out += '— Mrs. Deer'
    return out + renderTextFooter(user)
  },
}
