import { redirect } from 'next/navigation'

type TodayPageProps = {
  searchParams?: Promise<{ context?: string; parserPass?: string }>
}

/** Canonical morning planning lives at `/morning`; `/today` is the product alias for “today’s plan”. */
export default async function TodayPage({ searchParams }: TodayPageProps) {
  const sp = searchParams ? await searchParams : {}
  const qs = new URLSearchParams()
  const context = sp.context?.trim()
  if (context) qs.set('context', context)
  else if (sp.parserPass === '1') qs.set('context', 'decision')
  const q = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/morning${q}`)
}
