import Image from 'next/image'
import Link from 'next/link'
import { MoonStar, Puzzle, Sun } from 'lucide-react'
import { getPublishedBlogPosts, sortBlogPostsByDateDesc } from '@/lib/blog/published-posts'
import { SiteHeader } from '@/components/SiteHeader'

const DAILY_RHYTHM = [
  {
    icon: Sun,
    title: 'Morning Plan',
    body: 'Set 2–3 priorities. Mrs. Deer helps you focus on what moves the needle.',
  },
  {
    icon: MoonStar,
    title: 'Evening Reflection',
    body: 'Close the loop with a short reflection: what worked, what changed, what matters tomorrow.',
  },
  {
    icon: Puzzle,
    title: 'Gentle Coaching',
    body: 'Mrs. Deer notices patterns and offers insights: warm, steady, never pushy.',
  },
] as const

const VALUE_CARDS = [
  {
    emoji: '✨',
    title: 'Simplicity Over Complexity',
    body: 'No overwhelming dashboards. Just the essentials: plan, reflect, grow.',
    cardClass:
      'bg-amber-50/90 border-amber-100/80 dark:bg-amber-950/20 dark:border-amber-900/40',
  },
  {
    emoji: '🦌',
    title: 'Human-Centered Design',
    body: 'Mrs. Deer feels like a real coach—warm, understanding, and genuinely helpful.',
    cardClass:
      'bg-sky-50/90 border-sky-100/80 dark:bg-sky-950/20 dark:border-sky-900/40',
  },
  {
    emoji: '💳',
    title: 'Is it really free?',
    body: 'Yes. No credit card required during beta. We’re building with early users.',
    cardClass:
      'bg-rose-50/90 border-rose-100/80 dark:bg-rose-950/20 dark:border-rose-900/40',
  },
  {
    emoji: '⬇️',
    title: 'Do I need to download anything?',
    body: 'Nope. Works entirely in your browser—desktop or mobile.',
    cardClass:
      'bg-violet-50/90 border-violet-100/80 dark:bg-violet-950/20 dark:border-violet-900/40',
  },
  {
    emoji: '📈',
    title: 'What happens after beta?',
    body: 'Free tier remains. Pro tier at $29/mo. Beta users get special pricing.',
    cardClass:
      'bg-emerald-50/90 border-emerald-100/80 dark:bg-emerald-950/20 dark:border-emerald-900/40',
  },
  {
    emoji: '🔒',
    title: 'Privacy First',
    body: 'Your data stays yours. No selling, no sharing, no tracking across the web.',
    cardClass:
      'bg-slate-100/90 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-700/60',
  },
] as const

export default function HomePage() {
  const latestPosts = sortBlogPostsByDateDesc(getPublishedBlogPosts())
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, ...p.frontmatter }))

  return (
    <main className="-mt-4 bg-[#fdfcfb] text-[#1a1a1a]">
      <SiteHeader />
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-8 pb-24 sm:px-8 sm:pt-10 sm:pb-28 lg:pt-12 lg:pb-32">
        <div className="mb-12 overflow-hidden rounded-[2rem] border border-[#eaddd7] bg-orange-50/50 p-2 shadow-sm sm:p-3 lg:mb-16">
          <div className="relative aspect-[21/9] min-h-[200px] w-full overflow-hidden rounded-[1.35rem] sm:min-h-[240px] lg:min-h-[280px]">
            <Image
              src="/welcome-homepage-hero.png"
              alt="Mrs. Deer welcomes you to Wheel of Founders beside a founder taking notes, with charts and a warm office backdrop."
              fill
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover object-center"
            />
          </div>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef725c]">
              Welcome to the beta
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Turn today’s actions into better decisions tomorrow.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-[#4a4a4a]">
              Mrs. Deer helps founders move from chaos to rhythm: plan the day, close the loop, and
              notice patterns you were too busy to see.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-[#ef725c] px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#e96650]"
              >
                Enter the App →
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-2xl border border-[#eaddd7] bg-white px-6 py-4 text-base font-bold text-[#1a1a1a] transition hover:border-[#ef725c]"
              >
                Read the Founder’s Journal
              </Link>
            </div>
            <p className="mt-5 text-sm text-[#4a4a4a]">
              40+ founders already shaping the future. No credit card needed during beta.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#eaddd7] bg-white p-5 shadow-sm">
            <div className="rounded-[1.5rem] bg-[#f9f7f2] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ef725c]">
                    Today’s Rhythm
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#152b50]">Your Complete Loop</h2>
                </div>
                <div className="rounded-full bg-[#ef725c]/10 px-3 py-1 text-sm font-bold text-[#ef725c]">
                  Beta
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ['3 Needle Movers', 'Choose the few priorities that actually move the business.'],
                  ['Decision Log', 'Capture the why behind heavy choices so they stop looping at 2 AM.'],
                  ['Evening Reflection', 'Close the day, spot patterns, and let tomorrow start lighter.'],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-[#eaddd7] bg-[#fdfcfb] p-4 transition hover:border-[#ef725c]/40"
                  >
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#4a4a4a]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Daily rhythm */}
      <section className="border-y border-[#eaddd7] bg-white/70 px-5 py-24 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef725c]">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              A daily rhythm for founders who are tired of carrying everything alone.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-5">
            {DAILY_RHYTHM.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-3xl border border-[#eaddd7] bg-[#fdfcfb] p-6 shadow-sm transition hover:border-[#ef725c]/35"
              >
                <div className="mb-4 inline-flex rounded-2xl bg-orange-50/80 p-3 text-[#ef725c] ring-1 ring-orange-100/80 dark:bg-orange-950/30 dark:ring-orange-900/50">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-[#152b50]">{title}</h3>
                <p className="mt-3 leading-7 text-[#4a4a4a]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Mrs. Deer */}
      <section className="px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef725c]">
              Meet Mrs. Deer
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Not a chatbot. A companion who remembers your words.
            </h2>
            <div className="mt-8 rounded-3xl border border-[#eaddd7] bg-white p-8 shadow-sm">
              <blockquote className="text-xl leading-9 text-[#1a1a1a]">
                “Two entries, same timestamp. You named the tension clearly: ‘Gut yes, risk no.’
                That’s honest. Most people only write the task. You wrote the hesitation too.”
              </blockquote>
              <p className="mt-6 font-bold text-[#ef725c]">Mrs. Deer, your AI companion</p>
              <p className="mt-2 text-[#4a4a4a]">Warm. Steady. Wise. No corporate jargon.</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:justify-self-end">
            <div
              className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-[#eaddd7] shadow-md"
              style={{ backgroundColor: '#FFF0EC' }}
            >
              <Image
                src="/mrs-deer.png"
                alt="Mrs. Deer, your AI companion"
                fill
                className="object-contain p-8 sm:p-10 lg:p-12"
                sizes="(max-width: 1024px) 100vw, 480px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#f9f7f2] px-5 py-24 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight">What we stand for</h2>
          <p className="mt-3 max-w-2xl text-[#4a4a4a]">
            Built by founders, for founders. Every feature serves a real need.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_CARDS.map(({ emoji, title, body, cardClass }) => (
              <article
                key={title}
                className={`rounded-3xl border p-6 shadow-sm transition hover:shadow-md ${cardClass}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center rounded-full bg-white/80 px-2.5 py-1 text-base shadow-sm ring-1 ring-black/5 dark:bg-black/20 dark:ring-white/10"
                    aria-hidden
                  >
                    {emoji}
                  </span>
                  <h3 className="text-lg font-bold leading-snug text-[#152b50]">{title}</h3>
                </div>
                <p className="leading-7 text-[#4a4a4a]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      <section className="px-5 py-24 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef725c]">
                Founder’s Journal
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight">Latest insights</h2>
            </div>
            <Link href="/blog" className="font-bold text-[#ef725c] hover:underline">
              View all posts →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {latestPosts.map((post) => {
              const cover =
                post.coverImage?.startsWith('./')
                  ? `/blog/media/${post.slug}/${encodeURIComponent(post.coverImage.slice(2))}`
                  : post.coverImage
              return (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-3xl border border-[#eaddd7] bg-white shadow-sm"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={post.title}
                      className="aspect-video w-full object-cover"
                    />
                  ) : null}
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#4a4a4a]">
                      {post.date}
                    </p>
                    <h3 className="mt-2 text-lg font-bold leading-snug">
                      <Link href={`/blog/${post.slug}`} className="hover:text-[#ef725c]">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4a4a4a]">
                      {post.description}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 sm:px-8 lg:pb-32">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#eaddd7] bg-white p-8 text-center shadow-sm sm:p-12">
          <h2 className="text-4xl font-bold tracking-tight">Start seeing your patterns today.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#4a4a4a]">
            Join founders using daily reflection to build momentum, not burnout.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex rounded-2xl bg-[#ef725c] px-7 py-4 font-bold text-white transition hover:bg-[#e96650]"
          >
            Start 30 days free beta access
          </Link>
        </div>
      </section>
    </main>
  )
}
