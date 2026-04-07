export type CalendarEventInput = {
  uid: string
  title: string
  description: string
  url: string
  localHour: number
  localMinute: number
  rrule: string
  /** DTSTART date anchor in user TZ (e.g. upcoming Monday for FREQ=WEEKLY;BYDAY=MO). Defaults to “now”. */
  anchorDate?: Date
}

function escapeIcs(text: string): string {
  return text
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n')
}

function yyyymmdd(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '')
}

function dtstampUtc(): string {
  return new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
}

function getLongOffsetPart(date: Date, timeZone: string): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    })
    return dtf.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
  } catch {
    return 'GMT+00:00'
  }
}

/** Parse Intl `longOffset` (e.g. GMT+8, GMT-05:30) to ICS offset ±HHMM */
function parseLongOffsetToIcs(longOffset: string): string {
  const t = longOffset.replace(/\s/g, '').toUpperCase()
  if (t === 'GMT' || t === 'UTC') return '+0000'
  const m = t.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!m) return '+0000'
  const sign = m[1]
  const hh = Math.min(23, parseInt(m[2], 10))
  const mm = m[3] !== undefined ? Math.min(59, parseInt(m[3], 10)) : 0
  return `${sign}${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}`
}

/**
 * Single STANDARD VTIMEZONE when winter/summer offsets match (e.g. Asia/Hong_Kong).
 * For DST zones (offsets differ), returns '' so clients use TZID + their own zone data.
 */
function buildVtimezoneBlock(timeZone: string): string {
  const tz = timeZone.trim()
  if (!tz) return ''

  if (tz === 'UTC' || tz === 'Etc/UTC' || tz === 'Etc/GMT' || tz === 'GMT') {
    return [
      'BEGIN:VTIMEZONE',
      'TZID:UTC',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0000',
      'TZOFFSETTO:+0000',
      'END:STANDARD',
      'END:VTIMEZONE',
    ].join('\r\n')
  }

  const jan = new Date(Date.UTC(2025, 0, 15, 12, 0, 0))
  const jul = new Date(Date.UTC(2025, 6, 15, 12, 0, 0))
  const offJan = parseLongOffsetToIcs(getLongOffsetPart(jan, tz))
  const offJul = parseLongOffsetToIcs(getLongOffsetPart(jul, tz))
  if (offJan !== offJul) {
    return ''
  }

  const tzEsc = escapeIcs(tz)
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${tzEsc}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    `TZOFFSETFROM:${offJan}`,
    `TZOFFSETTO:${offJan}`,
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n')
}

function buildEventBlock(timeZone: string, baseDate: Date, event: CalendarEventInput): string {
  const anchor = event.anchorDate ?? baseDate
  const datePart = yyyymmdd(anchor, timeZone)
  const hh = String(event.localHour).padStart(2, '0')
  const mm = String(event.localMinute).padStart(2, '0')
  const endMinute = (event.localMinute + 10) % 60
  const endHour = event.localMinute + 10 >= 60 ? (event.localHour + 1) % 24 : event.localHour
  const eh = String(endHour).padStart(2, '0')
  const em = String(endMinute).padStart(2, '0')

  return [
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.uid)}`,
    `DTSTAMP:${dtstampUtc()}`,
    `DTSTART;TZID=${escapeIcs(timeZone)}:${datePart}T${hh}${mm}00`,
    `DTEND;TZID=${escapeIcs(timeZone)}:${datePart}T${eh}${em}00`,
    `RRULE:${event.rrule}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `URL:${escapeIcs(event.url)}`,
    'END:VEVENT',
  ].join('\r\n')
}

export function buildCalendarIcs(params: {
  timeZone: string
  calendarName: string
  /** Shown in some clients as subtitle (optional) */
  calendarDescription?: string
  events: CalendarEventInput[]
  /** Embed VTIMEZONE for fixed-offset zones so Google/Apple show local wall times correctly */
  includeVtimezone?: boolean
}): string {
  const now = new Date()
  const tz = params.timeZone.trim() || 'UTC'
  const vtz = params.includeVtimezone ? buildVtimezoneBlock(tz) : ''
  const events = params.events.map((e) => buildEventBlock(tz, now, e)).join('\r\n')

  const calName = escapeIcs(params.calendarName.trim())
  // Calendar title properties before METHOD/REFRESH/VTIMEZONE so clients see them early.
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wheel of Founders//Calendar Reminders//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${calName}`,
    `NAME:${calName}`,
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    `X-WR-TIMEZONE:${escapeIcs(tz)}`,
  ]
  if (params.calendarDescription?.trim()) {
    lines.push(`X-WR-CALDESC:${escapeIcs(params.calendarDescription.trim())}`)
  }
  if (vtz) lines.push(vtz)
  lines.push(events, 'END:VCALENDAR', '')

  return lines.join('\r\n')
}
