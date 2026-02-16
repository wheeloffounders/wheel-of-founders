/**
 * Export format generators: CSV, PDF
 */

export type ExportData = {
  exportType: string
  dateRange: { start: string; end: string }
  generatedAt: string
  data: {
    tasks: Array<Record<string, unknown>>
    decisions: Array<Record<string, unknown>>
    reviews: Array<Record<string, unknown>>
    emergencies: Array<Record<string, unknown>>
  }
}

/** Escape CSV cell - wrap in quotes if contains comma, newline, or quote */
function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Generate full CSV from export data */
export function generateCSV(data: ExportData): string {
  const rows: string[] = []
  const tasks = data.data.tasks ?? []
  const decisions = data.data.decisions ?? []
  const reviews = data.data.reviews ?? []
  const emergencies = data.data.emergencies ?? []

  // Header
  rows.push(
    [
      'Date',
      'Type',
      'Description',
      'Details',
      'Status',
      'Needle Mover',
      'Decision Type',
      'Mood',
      'Energy',
      'Severity',
    ].join(',')
  )

  for (const t of tasks) {
    rows.push(
      [
        t.plan_date ?? '',
        'Task',
        escapeCsvCell(t.description ?? ''),
        escapeCsvCell(t.why_this_matters ?? ''),
        (t as { completed?: boolean }).completed ? 'Completed' : 'Pending',
        (t as { needle_mover?: boolean }).needle_mover ? 'Yes' : '',
        '',
        '',
        '',
        '',
      ].join(',')
    )
  }

  for (const d of decisions) {
    rows.push(
      [
        d.plan_date ?? '',
        'Decision',
        escapeCsvCell(d.decision ?? ''),
        escapeCsvCell(d.why_this_decision ?? ''),
        '',
        '',
        d.decision_type ?? '',
        '',
        '',
        '',
      ].join(',')
    )
  }

  for (const r of reviews) {
    rows.push(
      [
        r.review_date ?? '',
        'Review',
        escapeCsvCell((r as { wins?: string }).wins ?? ''),
        escapeCsvCell((r as { lessons?: string }).lessons ?? ''),
        'Completed',
        '',
        '',
        r.mood ?? '',
        r.energy ?? '',
        '',
      ].join(',')
    )
  }

  for (const e of emergencies) {
    rows.push(
      [
        e.fire_date ?? '',
        'Emergency',
        escapeCsvCell(e.description ?? ''),
        escapeCsvCell(e.notes ?? ''),
        (e as { resolved?: boolean }).resolved ? 'Resolved' : 'Open',
        '',
        '',
        '',
        '',
        e.severity ?? '',
      ].join(',')
    )
  }

  return rows.join('\n')
}

/** Generate PDF from export data (server-side, uses jsPDF) */
export async function generatePDF(data: ExportData): Promise<Buffer> {
  // Dynamic import for server-side only
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = doc.getPageWidth()
  const margin = 40
  let y = margin

  const addText = (text: string, fontSize = 10, bold = false) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, pageW - margin * 2)
    for (const line of lines) {
      if (y > 750) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += fontSize * 1.2
    }
  }

  const addSection = (title: string) => {
    y += 8
    addText(title, 14, true)
    y += 4
  }

  // Title
  addText('Wheel of Founders Export', 18, true)
  y += 4
  addText(`Date range: ${data.dateRange.start} – ${data.dateRange.end}`)
  addText(`Generated: ${new Date(data.generatedAt).toLocaleString()}`)
  y += 12

  // Tasks
  const tasks = data.data.tasks ?? []
  if (tasks.length > 0) {
    addSection('Power List (Morning Tasks)')
    for (const t of tasks) {
      const desc = String(t.description ?? '')
      const nm = (t as { needle_mover?: boolean }).needle_mover ? ' [Needle Mover]' : ''
      const status = (t as { completed?: boolean }).completed ? ' ✓' : ''
      addText(`${t.plan_date}${nm}${status}: ${desc}`)
      if (t.why_this_matters) {
        addText(`   Why: ${t.why_this_matters}`, 9)
      }
    }
  }

  // Decisions
  const decisions = data.data.decisions ?? []
  if (decisions.length > 0) {
    addSection('Decision Log')
    for (const d of decisions) {
      addText(`${d.plan_date} [${d.decision_type}]: ${d.decision}`)
      if (d.why_this_decision) {
        addText(`   Why: ${d.why_this_decision}`, 9)
      }
    }
  }

  // Reviews
  const reviews = data.data.reviews ?? []
  if (reviews.length > 0) {
    addSection('Evening Reviews')
    for (const r of reviews) {
      const mood = r.mood ? `Mood: ${r.mood}` : ''
      const energy = r.energy ? `Energy: ${r.energy}` : ''
      addText(`${r.review_date} ${mood} ${energy}`.trim())
      if ((r as { wins?: string }).wins) {
        addText(`   Wins: ${(r as { wins?: string }).wins}`, 9)
      }
      if ((r as { lessons?: string }).lessons) {
        addText(`   Lessons: ${(r as { lessons?: string }).lessons}`, 9)
      }
    }
  }

  // Emergencies
  const emergencies = data.data.emergencies ?? []
  if (emergencies.length > 0) {
    addSection('Emergencies')
    for (const e of emergencies) {
      const resolved = (e as { resolved?: boolean }).resolved ? ' [Resolved]' : ''
      addText(`${e.fire_date} [${e.severity}]${resolved}: ${e.description}`)
      if (e.notes) {
        addText(`   Notes: ${e.notes}`, 9)
      }
    }
  }

  return Buffer.from(doc.output('arraybuffer'))
}
