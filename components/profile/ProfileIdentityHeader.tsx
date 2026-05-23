'use client'

import { ProfileAvatarUpload } from '@/components/profile/ProfileAvatarUpload'
import { ProfileBlueprintCard } from '@/components/profile/ProfileBlueprintCard'
import {
  profileDossierHintClassName,
  profileDossierInputClassName,
  profileDossierLabelClassName,
} from '@/lib/founder-dna/profile-dossier-styles'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import Link from 'next/link'
import { Edit2, MessageSquare } from 'lucide-react'
import type { UserGoal } from '@/lib/user-language'

type ProfileIdentityHeaderProps = {
  name: string
  onNameChange: (value: string) => void
  preferredName: string
  onPreferredNameChange: (value: string) => void
  companyName: string
  onCompanyNameChange: (value: string) => void
  email: string | undefined
  statusLine: string
  primaryGoal: UserGoal | null
  dashboardTitle: string
  progressText: string
}

export function ProfileIdentityHeader({
  name,
  onNameChange,
  preferredName,
  onPreferredNameChange,
  companyName,
  onCompanyNameChange,
  email,
  statusLine,
  primaryGoal,
  dashboardTitle,
  progressText,
}: ProfileIdentityHeaderProps) {
  return (
    <ProfileBlueprintCard variant="identity" className="mb-8 w-full" as="section" aria-labelledby="profile-identity">
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start">
        <ProfileAvatarUpload name={name} />

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
              Founder dossier
            </p>
            <h1 id="profile-identity" className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              Identity blueprint
            </h1>
            <p className="mt-2 font-mono text-xs tracking-wider text-indigo-700/90 dark:text-indigo-300/90">
              {statusLine}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{progressText}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={profileDossierLabelClassName}>
                Legal name <span className="text-[#ef725c]">*</span>
              </label>
              <SpeechToTextInput
                type="text"
                id="name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g., Alex Chen"
                required
                className={profileDossierInputClassName}
              />
              <p className={profileDossierHintClassName}>How Mrs. Deer greets you in session.</p>
            </div>

            <div>
              <label htmlFor="preferred_name" className={profileDossierLabelClassName}>
                Preferred name
              </label>
              <SpeechToTextInput
                type="text"
                id="preferred_name"
                value={preferredName}
                onChange={(e) => onPreferredNameChange(e.target.value)}
                placeholder="Alex, Al…"
                className={profileDossierInputClassName}
              />
            </div>

            <div>
              <label htmlFor="company_name" className={profileDossierLabelClassName}>
                Company / venture
              </label>
              <SpeechToTextInput
                type="text"
                id="company_name"
                value={companyName}
                onChange={(e) => onCompanyNameChange(e.target.value)}
                placeholder="Acme Studios"
                className={profileDossierInputClassName}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={profileDossierLabelClassName}>Email</label>
              <p className="rounded-lg border border-slate-200/60 bg-white/90 px-4 py-2.5 font-mono text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-gray-900/80 dark:text-slate-300">
                {email ?? '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
            {primaryGoal ? (
              <div className="flex items-center gap-2">
                <span className={profileDossierLabelClassName + ' mb-0'}>Current goal</span>
                <span className="rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 font-mono text-[10px] tracking-wider text-amber-900 uppercase dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
                  {dashboardTitle}
                </span>
                <Link
                  href="/settings"
                  className="text-sm text-[#ef725c] hover:underline inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Change
                </Link>
              </div>
            ) : null}
            <Link
              href="/feedback"
              className="text-sm text-[#ef725c] hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Give Feedback
            </Link>
          </div>
        </div>
      </div>
    </ProfileBlueprintCard>
  )
}
