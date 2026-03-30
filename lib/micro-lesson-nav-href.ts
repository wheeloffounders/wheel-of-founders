/**
 * Ensure internal morning/evening links include plan_date so late-night users land on the right day.
 */
export function resolveMicroLessonNavHref(link: string, planDate: string): string {
  if (link.startsWith('http://') || link.startsWith('https://')) return link

  if (link === '/evening') {
    return `/evening?date=${planDate}#evening-form`
  }
  if (link.startsWith('/evening')) {
    if (!link.includes('date=')) {
      const hashIdx = link.indexOf('#')
      const base = hashIdx >= 0 ? link.slice(0, hashIdx) : link
      const hash = hashIdx >= 0 ? link.slice(hashIdx) : '#evening-form'
      const sep = base.includes('?') ? '&' : '?'
      return `${base}${sep}date=${planDate}${hash.startsWith('#') ? hash : `#${hash}`}`
    }
    return link.includes('#') ? link : `${link}#evening-form`
  }
  if (link === '/morning') {
    return `/morning?date=${planDate}`
  }
  if (link.startsWith('/morning') && !link.includes('date=')) {
    const sep = link.includes('?') ? '&' : '?'
    return `${link}${sep}date=${planDate}`
  }
  return link
}
