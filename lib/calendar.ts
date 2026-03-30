'use client'

export type CalendarType = 'google' | 'apple' | 'outlook' | 'other'

type CalendarEvent = {
  title: string
  description: string
  location: string
  start: string // UTC format for calendar providers
  end: string // UTC format for calendar providers
  recurrence: string // RRULE=...
}

function toUtcCompact(date: Date) {
  // YYYYMMDDTHHMMSSZ (UTC)
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(text: string) {
  // Basic escaping per RFC5545
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function generateCalendarEvent(time: string): CalendarEvent {
  const [hoursStr, minutesStr] = time.split(':')
  const hours = Number.parseInt(hoursStr ?? '20', 10)
  const minutes = Number.parseInt(minutesStr ?? '0', 10)

  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)

  const endDate = new Date(startDate)
  endDate.setMinutes(endDate.getMinutes() + 5)

  return {
    title: 'Evening Reflection with Mrs. Deer',
    description: "Reflect on today's wins, lessons, and energy. This is where patterns emerge.",
    location: 'https://app.wheeloffounders.com/evening',
    start: toUtcCompact(startDate),
    end: toUtcCompact(endDate),
    recurrence: 'RRULE:FREQ=DAILY',
  }
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  let url =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(event.title)}` +
    `&dates=${encodeURIComponent(`${event.start}/${event.end}`)}` +
    `&details=${encodeURIComponent(event.description)}` +
    `&location=${encodeURIComponent(event.location)}`
  if (event.recurrence) {
    url += `&recur=${encodeURIComponent(event.recurrence)}`
  }
  return url
}

export function downloadIcsFile(event: CalendarEvent, filename = 'evening-reflection.ics') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wheel of Founders//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DTSTART:${event.start}`,
    `DTEND:${event.end}`,
  ]
  if (event.recurrence) lines.push(event.recurrence)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  const icsContent = lines.join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function buildNextMorningInsightReminderEvent(time: string): CalendarEvent {
  const [hoursStr, minutesStr] = time.split(':')
  const hours = Number.parseInt(hoursStr ?? '8', 10)
  const minutes = Number.parseInt(minutesStr ?? '0', 10)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(hours, minutes, 0, 0)
  const endDate = new Date(startDate)
  endDate.setMinutes(endDate.getMinutes() + 10)
  return {
    title: 'Morning insight with Mrs. Deer',
    description:
      'Open Wheel of Founders to see your personalized morning insight — shaped by what you shared last night.',
    location: 'https://app.wheeloffounders.com/morning',
    start: toUtcCompact(startDate),
    end: toUtcCompact(endDate),
    recurrence: '',
  }
}

export async function handleCalendarAdd(type: CalendarType, time: string) {
  const event = generateCalendarEvent(time)

  await fetch('/api/user/calendar-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time, type }),
  })

  if (type === 'google') {
    window.open(getGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer')
    return
  }

  // Apple/Outlook/Other: ICS download
  downloadIcsFile(event)
}

/** One-shot “tomorrow morning” reminder after First Glimpse (Day 1 evening). */
export async function handleMorningInsightReminderAdd(type: CalendarType, time: string) {
  const event = buildNextMorningInsightReminderEvent(time)
  await fetch('/api/user/calendar-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time, type, context: 'morning_insight_reminder' }),
  })
  if (type === 'google') {
    window.open(getGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer')
    return
  }
  downloadIcsFile(event, 'morning-insight-reminder.ics')
}

