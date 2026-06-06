/**
 * Best-effort search keyword from first-touch inbound context.
 * Note: Google organic search almost never passes the query in referrer anymore.
 * Paid/UTM links (?utm_term=) and some engines (Bing, DuckDuckGo) still can.
 */

const REFERRER_QUERY_PARAMS = ['q', 'p', 'query', 'search', 'wd', 'text', 'keyword'] as const

function engineFromHostname(hostname: string): string {
  const h = hostname.replace(/^www\./i, '').toLowerCase()
  if (h.includes('google.')) return 'google'
  if (h === 'bing.com' || h.endsWith('.bing.com')) return 'bing'
  if (h.includes('duckduckgo.')) return 'duckduckgo'
  if (h.includes('yahoo.')) return 'yahoo'
  if (h.includes('baidu.')) return 'baidu'
  if (h.includes('yandex.')) return 'yandex'
  if (h.includes('ecosia.')) return 'ecosia'
  return h.split('.')[0] || 'search'
}

export function parseSearchKeywordFromReferrer(
  referrer: string | null | undefined
): { search_engine: string; search_keyword: string } | null {
  const ref = typeof referrer === 'string' ? referrer.trim() : ''
  if (!ref) return null
  try {
    const u = new URL(ref)
    const engine = engineFromHostname(u.hostname)
    for (const param of REFERRER_QUERY_PARAMS) {
      const raw = u.searchParams.get(param)
      if (!raw?.trim()) continue
      const keyword = decodeURIComponent(raw.replace(/\+/g, ' ')).trim().slice(0, 200)
      if (keyword) return { search_engine: engine, search_keyword: keyword }
    }
  } catch {
    /* ignore */
  }
  return null
}

export function parseUtmTermFromSearch(search: string | null | undefined): string {
  if (!search || typeof search !== 'string') return ''
  const s = search.startsWith('?') ? search : search.includes('?') ? search.slice(search.indexOf('?')) : ''
  if (!s) return ''
  try {
    return (new URLSearchParams(s).get('utm_term') ?? '').trim().slice(0, 200)
  } catch {
    return ''
  }
}

export function resolveInboundSearchKeyword(input: {
  referrer?: string | null
  utm_term?: string | null
  first_landing_page?: string | null
  utm_source?: string | null
}): { search_keyword: string; search_engine: string; utm_term: string } {
  const utm_term = (input.utm_term ?? '').trim().slice(0, 200)
  if (utm_term) {
    return { search_keyword: utm_term, search_engine: 'utm', utm_term }
  }

  const fromLanding = parseUtmTermFromSearch(input.first_landing_page ?? '')
  if (fromLanding) {
    return { search_keyword: fromLanding, search_engine: 'utm', utm_term: fromLanding }
  }

  const fromReferrer = parseSearchKeywordFromReferrer(input.referrer)
  if (fromReferrer) {
    return {
      search_keyword: fromReferrer.search_keyword,
      search_engine: fromReferrer.search_engine,
      utm_term: '',
    }
  }

  return { search_keyword: '', search_engine: '', utm_term: '' }
}

export function hasSearchKeyword(keyword: string | null | undefined): boolean {
  return typeof keyword === 'string' && keyword.trim().length > 0
}
