import { redirect } from 'next/navigation'
import { morningHandoffPathFromTodaySearchParams } from '@/lib/morning-handoff-from-today-query'

type PageProps = {
  searchParams?: Promise<{ context?: string; parserPass?: string; from?: string; funnel?: string }>
}

/** Canonical morning planning lives at `/morning`; `/today` is the product alias for today's plan. */
export default async function Page({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {}
  const inbound = new URLSearchParams()
  if (sp.context?.trim()) inbound.set('context', sp.context.trim())
  if (sp.parserPass === '1') inbound.set('parserPass', '1')
  if (sp.from?.trim()) inbound.set('from', sp.from.trim())
  if (sp.funnel?.trim()) inbound.set('funnel', sp.funnel.trim())
  redirect(morningHandoffPathFromTodaySearchParams(inbound))
}
