import { redirect } from 'next/navigation'

type PageProps = {
  searchParams?: Promise<{ context?: string; parserPass?: string; from?: string; funnel?: string }>
}

/** Canonical morning planning lives at `/morning`; `/today` is the product alias for today's plan. */
export default async function Page({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {}
  const qs = new URLSearchParams()
  const context = sp.context?.trim()
  if (context) qs.set('context', context)
  else if (sp.parserPass === '1') qs.set('context', 'decision')
  const from = sp.from?.trim()
  if (from && from.startsWith('/blog')) qs.set('from', from)
  const funnel = sp.funnel?.trim()
  if (funnel) qs.set('funnel', funnel)
  const q = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/morning${q}`)
}
