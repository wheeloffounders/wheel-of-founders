import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'
import { ARCHETYPE_FULL_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'

function dayWord(n: number): string {
  const d = Math.max(1, Math.floor(n))
  return `${d} day${d === 1 ? '' : 's'}`
}

export const founderArchetypeFullTemplate: EmailTemplate = {
  getSubject: (user) => `${emailSubjectGreetingFromUser(user)}, your founder archetype is ready`,
  getHtml: (user, data) => {
    const rawDays = Number(data?.daysWithEntries ?? ARCHETYPE_FULL_MIN_DAYS)
    const n = Number.isFinite(rawDays) ? Math.max(ARCHETYPE_FULL_MIN_DAYS, rawDays) : ARCHETYPE_FULL_MIN_DAYS
    const greeting = emailSubjectGreetingFromUser(user)
    const dw = dayWord(n)
    const bodyHtml = `<p style="font-style:italic;color:#334155;line-height:1.65;">Hi ${greeting},</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">After ${dw} of entries, your founder style has fully emerged — how you build, decide, and lead.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">Your Founder Archetype is ready. It's a mirror for the kind of founder you're becoming.</p>`
    const afterCta = `<p style="font-style:italic;color:#334155;line-height:1.65;">Every 90 days, I'll refresh this as you grow.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;margin-top:20px;">— Mrs. Deer</p>`
    return renderEmailLayout({
      user,
      title: '',
      bodyHtml,
      bodyOnly: true,
      afterCtaHtml: afterCta,
      ctaLabel: 'See my archetype →',
      ctaUrl: appUrlWithUtm('/founder-dna/archetype', 'founder_archetype_full'),
      preheader: 'Your founder archetype is ready',
    })
  },
  getText: (user, data) => {
    const rawDays = Number(data?.daysWithEntries ?? ARCHETYPE_FULL_MIN_DAYS)
    const n = Number.isFinite(rawDays) ? Math.max(ARCHETYPE_FULL_MIN_DAYS, rawDays) : ARCHETYPE_FULL_MIN_DAYS
    const greeting = emailSubjectGreetingFromUser(user)
    const dw = dayWord(n)
    return `Hi ${greeting},

After ${dw} of entries, your founder style has fully emerged — how you build, decide, and lead.

Your Founder Archetype is ready. It's a mirror for the kind of founder you're becoming.

See my archetype: ${appUrlWithUtm('/founder-dna/archetype', 'founder_archetype_full')}

Every 90 days, I'll refresh this as you grow.

— Mrs. Deer${renderTextFooter(user)}`
  },
}
