import { redirect } from 'next/navigation'

/** Weekly chapter archive audit moved to Weekly Insight. */
export default function FounderDnaJourneyFreemiumAuditRedirect() {
  redirect('/weekly?view=archive')
}
