'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { Camera, Loader2, Pencil, User } from 'lucide-react'
import { cn } from '@/components/ui/utils'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

type ProfileAvatarUploadProps = {
  name: string
  className?: string
}

function initialsFromName(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'FD'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function ProfileAvatarUpload({ name, className }: ProfileAvatarUploadProps) {
  const inputId = useId()
  const [isUploading, setIsUploading] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const initials = initialsFromName(name)

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadError(null)

    try {
      setIsUploading(true)

      if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
        setUploadError('Use PNG, JPEG, or WebP.')
        return
      }

      if (file.size > MAX_AVATAR_BYTES) {
        setUploadError('Image must be 2MB or smaller.')
        return
      }

      // Future: Supabase Storage upload bundle — persist public URL on user_profiles
      console.log('Uploading file source:', file.name)

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })

      const nextUrl = URL.createObjectURL(file)
      setAvatarPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return nextUrl
      })
    } catch (error) {
      console.error('Upload friction encountered:', error)
      setUploadError('Could not load that image. Try again.')
    } finally {
      setIsUploading(false)
    }
  }, [])

  return (
    <div className={cn('shrink-0', className)}>
      <div className="group relative h-20 w-20">
      <label
        htmlFor={inputId}
        className={cn(
          'relative block h-full w-full cursor-pointer overflow-hidden rounded-full border border-slate-200 shadow-sm dark:border-slate-600',
          isUploading && 'pointer-events-none',
        )}
        aria-label={avatarPreviewUrl ? 'Update profile photo' : 'Upload profile photo'}
      >
        {avatarPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob preview until storage URL exists
          <img
            src={avatarPreviewUrl}
            alt=""
            className={cn(
              'h-full w-full object-cover',
              isUploading && 'opacity-60',
            )}
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-slate-100 font-medium text-xl text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              isUploading && 'opacity-60',
            )}
          >
            {name.trim() ? (
              <span className="font-mono tracking-wider">{initials}</span>
            ) : (
              <User className="h-8 w-8 text-slate-400" aria-hidden />
            )}
          </div>
        )}

        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 transition-opacity',
            isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
          ) : (
            <>
              <Camera className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
              <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/90">
                Update
              </span>
            </>
          )}
        </div>

        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(e) => void handleImageUpload(e)}
        />
      </label>

      <span
        className={cn(
          'pointer-events-none absolute bottom-0 right-0 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-opacity dark:border-slate-600 dark:bg-gray-900',
          isUploading ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
        )}
        aria-hidden
      >
        <Pencil className="h-3 w-3 text-slate-600 dark:text-slate-300" strokeWidth={2} />
      </span>
      </div>

      {uploadError ? (
        <p className="mt-2 max-w-[5rem] text-center text-[10px] leading-tight text-red-600 dark:text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  )
}
