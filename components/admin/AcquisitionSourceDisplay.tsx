import {
  acquisitionDetailLines,
  acquisitionSourceLabel,
  parseUserAcquisitionSnapshot,
  type UserAcquisitionSnapshot,
} from '@/lib/acquisition-snapshot'

type Props = {
  snapshot: unknown
  compact?: boolean
}

export function AcquisitionSourceDisplay({ snapshot, compact = false }: Props) {
  const parsed = parseUserAcquisitionSnapshot(snapshot)
  if (!parsed) {
    return (
      <span className="text-gray-500 dark:text-gray-400" title="No acquisition data (direct or pre-tracking signup)">
        unknown
      </span>
    )
  }

  const label = acquisitionSourceLabel(parsed)
  const lines = acquisitionDetailLines(parsed)
  const title = lines.length > 0 ? lines.join('\n') : label

  if (compact) {
    return (
      <span className="font-medium text-emerald-700 dark:text-emerald-300" title={title}>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-1" title={title}>
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{label}</p>
      {parsed.first_landing_page ? (
        <p className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate max-w-md">
          {parsed.first_landing_page}
        </p>
      ) : null}
      {lines.length > 0 ? (
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function acquisitionSnapshotFromProfile(
  profile: Record<string, unknown> | null | undefined
): UserAcquisitionSnapshot | null {
  return parseUserAcquisitionSnapshot(profile?.acquisition_snapshot)
}
