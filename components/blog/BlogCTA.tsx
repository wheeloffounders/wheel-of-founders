'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Inter, Lora } from 'next/font/google'
import { getBlogInteractiveFunnel, type InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import {
  hasBlogTrialGiftInSession,
  hasPendingBlogPlanHandoff,
  subscribeBlogTrialGiftUnlock,
} from '@/lib/blog-trial-gift-session'

const ctaHeading = Lora({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

const ctaSans = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

const box: CSSProperties = {
  backgroundColor: '#fdfcfb',
  border: '1px solid #eaddd7',
  borderRadius: '1.5rem',
  padding: '3rem',
  textAlign: 'center',
  marginTop: '3rem',
  marginBottom: '3rem',
  isolation: 'isolate',
}

const heading: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
  fontWeight: 700,
  lineHeight: 1.25,
  letterSpacing: '-0.02em',
}

const headingText: CSSProperties = {
  color: '#1a1a1a',
}

const sub: CSSProperties = {
  margin: '1rem auto 0',
  maxWidth: '36rem',
  fontSize: '1.125rem',
  lineHeight: 1.65,
  color: '#4a4a4a',
}

const button: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '2rem',
  padding: '0.75rem 1.5rem',
  borderRadius: '0.75rem',
  border: 'none',
  textDecoration: 'none',
  fontSize: '1rem',
  lineHeight: 1.25,
  backgroundColor: '#ef725c',
  cursor: 'pointer',
  WebkitFontSmoothing: 'antialiased',
}

const buttonLabel: CSSProperties = {
  color: '#ffffff',
  fontWeight: 700,
}

type BlogCTAVariant = 'inline' | 'recap'

type BlogCTAProps = {
  /** Registry id for `/today` handoff + auth social proof (alias of `funnel`). */
  context?: InteractiveFunnelId
  /** Same as `context`; use whichever reads clearer in MDX (`funnel` wins if both are set). */
  funnel?: InteractiveFunnelId
  variant?: BlogCTAVariant
  title?: string
  text?: string
  buttonLabel?: string
}

const CTA_COPY: Record<InteractiveFunnelId, { title: string; text: string; buttonLabel: string }> = {
  eos: {
    title: 'EOS Strategy Loop',
    text: 'Run your day with professional clarity.',
    buttonLabel: 'Start My Loop',
  },
  energy: {
    title: 'Energy Audit',
    text: 'Stop fighting your battery levels.',
    buttonLabel: 'Protect My Energy',
  },
  decision: {
    title: 'Decision Log',
    text: 'Clear the 2 AM mental fog.',
    buttonLabel: 'Save My Decision',
  },
  solo_founder_burnout: {
    title: 'Protect your battery',
    text: 'Turn the article into a real boundary—starting tomorrow morning.',
    buttonLabel: 'Open my energy map',
  },
  inbox_zero_trap: {
    title: 'Beat the inbox trap',
    text: 'Put your leverage task first—not the easy email wins.',
    buttonLabel: 'Open my leverage filter',
  },
  partnering_spouse: {
    title: 'Sync with your spouse',
    text: 'Split the plates now so tonight stays peaceful.',
    buttonLabel: 'Open our split plan',
  },
  sunday_reset: {
    title: 'Sunday night reset',
    text: 'Clear the mental tabs—wake up Monday with one intention, not a storm.',
    buttonLabel: 'Draft my Monday win',
  },
  context_switch: {
    title: 'Context switching audit',
    text: 'Match deep work to laptop time—and pocket the rest for stolen moments.',
    buttonLabel: 'Audit my transitions',
  },
  post_trip: {
    title: 'Post-trip re-entry',
    text: 'After family travel, lead with one fire—then get your rhythm back.',
    buttonLabel: 'Triage my backlog',
  },
  product_co_design: {
    title: 'Product co-design',
    text: 'Name the friction; Mrs. Deer routes the right tool in your next plan.',
    buttonLabel: 'Start co-designing with Mrs. Deer',
  },
  founder_guilt_audit: {
    title: 'Guilt-aware recovery',
    text: 'Name the guilt. Hold the reframe. Step into the plan.',
    buttonLabel: 'Start my guilt-aware recovery',
  },
  burnout_diagnostic: {
    title: 'Recovery blueprint',
    text: 'Generic rest will not fix a systemic mismatch. See your pattern in the app.',
    buttonLabel: 'Get my recovery blueprint',
  },
  burnout_whisperer: {
    title: 'Early warning scan',
    text: 'Name the whispers before they become a crash—Mrs. Deer turns them into a plan.',
    buttonLabel: 'Claim my early warning plan',
  },
  delegation_stress_test: {
    title: 'Delegation mirror',
    text: 'Separate limb from baby—then hand off with a Done Checklist, not anxiety.',
    buttonLabel: 'Claim my delegation mirror',
  },
  legacy_continuity_mapper: {
    title: 'Legacy continuity',
    text: 'Move from "the business survives" to "the impact continues"—one map, then your daily OS.',
    buttonLabel: 'Integrate legacy into my daily OS',
  },
  fulfillment_gap_analyzer: {
    title: 'Fulfillment gap',
    text: 'See the Success Paradox as data—then close it with meaning, not just metrics.',
    buttonLabel: 'Close my fulfillment gap',
  },
  discipline_loop_designer: {
    title: 'Discipline loop',
    text: 'Design trigger → tiny habit → celebration once. Mrs. Deer becomes your streak coach.',
    buttonLabel: 'Claim my discipline coach',
  },
  needle_mover_distiller: {
    title: 'Needle-Mover distiller',
    text: 'Sift your unlimited list into three lines—primary, support, and noise to ignore.',
    buttonLabel: 'Activate my Smart Constraints',
  },
  decision_clarity_bench: {
    title: 'Virtual Co-Founder',
    text: 'Park the fork, your reasoning, and a review date—Mrs. Deer holds the receipt so 2 AM stays quiet.',
    buttonLabel: 'Offload my next decision',
  },
  mission_drift_filter: {
    title: 'Mission alignment filter',
    text: 'Run one shiny idea through purpose, persona fit, and talent—then log a Purpose Protection move.',
    buttonLabel: 'Protect my mission',
  },
  success_hangover_lab: {
    title: 'Meaning experiment lab',
    text: 'Map the hollow win, your evolving values, and one experiment—Mrs. Deer saves your Post-Success Compass.',
    buttonLabel: 'Start my meaning experiment',
  },
  vision_bridge_builder: {
    title: 'Vision bridge builder',
    text: 'Link your castle to one daily brick—Mrs. Deer keeps the chasm narrow on your Morning Canvas.',
    buttonLabel: 'Lay my daily brick',
  },
  finished_enough_toggle: {
    title: "The 'Finished Enough' Toggle",
    text: 'Name the itch, calibrate presence vs profit, and draw one honest shutdown line Mrs. Deer can hold tomorrow.',
    buttonLabel: 'Claim My Presence',
  },
}

function stripDraftLabel(raw: string): string {
  const s = raw.replace(/\s*\(draft\)\s*$/i, '').trim()
  return s.length > 0 ? s : 'plan'
}

/**
 * Blog conversion CTA — inline styles so global/prose rules cannot zero out contrast.
 * Pass `funnel` or `context` (registry id); the link uses `handoffContext` + `funnel` query for auth social proof continuity.
 */
export function BlogCTA({
  context,
  funnel,
  variant = 'recap',
  title,
  text,
  buttonLabel: ctaButtonLabel,
}: BlogCTAProps) {
  const registryId: InteractiveFunnelId = funnel ?? context ?? 'decision'
  const pathname = usePathname()
  const funnelConfig = getBlogInteractiveFunnel(registryId)
  const defaultCopy = CTA_COPY[registryId]
  const headingTitle = title ?? defaultCopy.title
  const bodyText = text ?? defaultCopy.text
  const baseButtonText = ctaButtonLabel ?? defaultCopy.buttonLabel

  const explicitRegistryChoice = funnel !== undefined || context !== undefined
  const [handoffGiftSignals, setHandoffGiftSignals] = useState(false)
  useEffect(() => {
    const sync = () => {
      setHandoffGiftSignals(hasBlogTrialGiftInSession() || hasPendingBlogPlanHandoff())
    }
    sync()
    return subscribeBlogTrialGiftUnlock(sync)
  }, [])

  const showTrialGiftUi = explicitRegistryChoice && handoffGiftSignals
  const saveContextLabel = stripDraftLabel(funnelConfig?.microPlannerLabel ?? defaultCopy.title)
  const buttonText = showTrialGiftUi
    ? `Unlock Pro Trial & Save My ${saveContextLabel}`
    : baseButtonText
  const href = useMemo(() => {
    const q = new URLSearchParams()
    const handoff = funnelConfig?.handoffContext ?? registryId
    q.set('context', handoff)
    q.set('funnel', funnelConfig?.id ?? registryId)
    return `/today?${q.toString()}`
  }, [registryId, funnelConfig?.handoffContext, funnelConfig?.id])

  const rememberLastBlogPost = () => {
    if (typeof window === 'undefined') return
    if (!pathname?.startsWith('/blog')) return
    try {
      sessionStorage.setItem('last_blog_post', pathname)
    } catch {
      // best effort
    }
  }

  const boxStyle: CSSProperties =
    variant === 'inline'
      ? { ...box, marginTop: '2rem', marginBottom: '2rem', padding: '1.75rem' }
      : box
  const headingStyle: CSSProperties =
    variant === 'inline' ? { ...heading, fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' } : heading
  const subStyle: CSSProperties =
    variant === 'inline' ? { ...sub, marginTop: '0.6rem', fontSize: '1rem', lineHeight: 1.55 } : sub
  const buttonStyle: CSSProperties =
    variant === 'inline' ? { ...button, marginTop: '1.2rem', padding: '0.7rem 1.2rem' } : button

  return (
    <aside style={boxStyle} aria-labelledby="blog-cta-heading">
      {showTrialGiftUi ? (
        <p
          className={ctaSans.className}
          style={{
            margin: '0 0 0.75rem',
            fontSize: variant === 'inline' ? '0.65rem' : '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#b45309',
          }}
        >
          Gift unlocked
        </p>
      ) : null}
      <h2 id="blog-cta-heading" className={ctaHeading.className} style={headingStyle}>
        <span style={headingText}>{headingTitle}</span>
      </h2>
      {showTrialGiftUi ? (
        <p
          className={ctaSans.className}
          style={{
            margin: '0.75rem auto 0',
            maxWidth: '38rem',
            fontSize: variant === 'inline' ? '0.95rem' : '1.02rem',
            lineHeight: 1.55,
            color: '#1a1a1a',
            fontWeight: 600,
          }}
        >
          Gift Unlocked: Because you&apos;ve done the deep work, I&apos;m granting you early access to Mrs. Deer Pro.
        </p>
      ) : null}
      <p className={ctaSans.className} style={subStyle}>
        {bodyText}
      </p>
      <Link href={href} onClick={rememberLastBlogPost} className={ctaSans.className} style={buttonStyle}>
        <span style={buttonLabel}>{buttonText}</span>
      </Link>
    </aside>
  )
}
