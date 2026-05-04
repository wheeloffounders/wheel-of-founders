import Link from 'next/link'
import type { Metadata } from 'next'
import { BlogCTA } from '@/components/blog/BlogCTA'

export const metadata: Metadata = {
  title: 'Solo Founder Operating System Template | Wheel of Founders',
  description:
    'A free branded template for solo founders: decision log, weekly review, Only Three daily framework, admin blitz, and end-of-day reflection prompts.',
  robots: { index: true, follow: true },
}

const sections = [
  {
    title: '1. Decision Log',
    intro: 'Use this when a decision feels heavier than it should.',
    body: [
      'Date:',
      'Decision:',
      'Options considered:',
      'Chosen path:',
      'Why:',
      'Check-in date:',
    ],
    prompts: [
      'What decision am I avoiding?',
      'What are the two realistic options?',
      'What would make this decision reversible?',
      'When will I review the outcome?',
    ],
  },
  {
    title: '2. Friday Weekly Review',
    intro: 'Run this as your 30-minute personal board meeting.',
    body: ['Energy score:', 'Focus score:', 'Progress score:', 'Next week’s one big thing:'],
    prompts: [
      'What decision from this week needs a check-in?',
      'What worked better than expected?',
      'What kept creating friction?',
      'When will I schedule my highest-energy work?',
    ],
  },
  {
    title: '3. Only Three Daily Framework',
    intro: 'Choose three needle-moving tasks before the day starts choosing for you.',
    body: ['Revenue task:', 'Operations task:', 'Learning task:'],
    prompts: [
      'Which task directly creates or protects revenue?',
      'Which task reduces future operational friction?',
      'Which learning task compounds my judgment?',
    ],
  },
  {
    title: '4. Admin Blitz',
    intro: 'Batch the work that usually leaks across the whole week.',
    body: ['Block 1:', 'Block 2:', 'Email:', 'Invoices:', 'Paperwork:', 'Follow-ups:'],
    prompts: [
      'What admin task keeps interrupting deep work?',
      'What can wait until the next admin block?',
      'What should become a recurring system?',
    ],
  },
]

export default function SoloFounderOperatingSystemTemplatePage() {
  return (
    <main className="min-h-screen bg-[#fdfcfb] px-4 py-12 text-[#1a1a1a] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-8 flex items-center justify-between text-sm">
          <Link href="/blog/solo-founder-operating-system" className="font-medium text-[#ef725c] hover:underline">
            ← Back to article
          </Link>
          <Link href="/templates/solo-founder-operating-system-template.md" className="font-medium text-[#ef725c] hover:underline">
            Raw Markdown
          </Link>
        </nav>

        <header className="rounded-3xl border border-[#eaddd7] bg-white/70 p-8 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ef725c]">
            Free Founder Template
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Solo Founder Operating System
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4a4a4a]">
            A simple weekly and daily template for founders wearing every hat: close decision loops,
            choose only three priorities, and stop letting admin leak across the whole day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/templates/solo-founder-operating-system-template.md"
              download
              className="inline-flex rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#e96650]"
            >
              Download Markdown Template
            </a>
            <Link
              href="/auth/signup"
              className="inline-flex rounded-xl border border-[#eaddd7] bg-[#fdfcfb] px-5 py-3 text-sm font-bold text-[#1a1a1a] transition hover:border-[#ef725c]"
            >
              Automate This in Wheel of Founders
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-6">
          {sections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-[#eaddd7] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
              <p className="mt-2 text-[#4a4a4a]">{section.intro}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-[#f9f7f2] p-4">
                  <h3 className="font-semibold">Fill This In</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#4a4a4a]">
                    {section.body.map((item) => (
                      <li key={item} className="border-b border-[#eaddd7] pb-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-[#fdfcfb] p-4">
                  <h3 className="font-semibold">Prompts</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#4a4a4a]">
                    {section.prompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-[#eaddd7] bg-[#f9f7f2] p-6">
          <h2 className="text-2xl font-bold">End-of-Day Reflection</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[#4a4a4a]">
            <li>What did I finish?</li>
            <li>What is still open?</li>
            <li>What did I learn about my energy?</li>
            <li>What should I stop carrying manually?</li>
          </ul>
        </section>

        <BlogCTA />
      </div>
    </main>
  )
}
