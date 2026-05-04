import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Inter, Lora } from 'next/font/google'

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

/**
 * Blog conversion CTA — inline styles so global/prose rules cannot zero out contrast.
 */
export function BlogCTA() {
  return (
    <aside style={box} aria-labelledby="blog-cta-heading">
      <h2 id="blog-cta-heading" className={ctaHeading.className} style={heading}>
        <span style={headingText}>Stop the Mental Leakage.</span>
      </h2>
      <p className={ctaSans.className} style={sub}>
        Most founders drown in input. Use Mrs. Deer to recalibrate your chaos into a Strategist Pace.
      </p>
      <Link href="/signup" className={ctaSans.className} style={button}>
        <span style={buttonLabel}>Enter the Wheel of Founders</span>
      </Link>
    </aside>
  )
}
