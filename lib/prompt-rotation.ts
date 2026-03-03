/**
 * Prompt versioning and rotation for IP protection.
 * Stores prompt versions in DB; rotation creates slight variations.
 */
import { getServerSupabase } from './server-supabase'

export interface PromptVersion {
  id: string
  version_number: number
  system_prompt: string
  tone_rules: string
  banned_phrases: string
  structure: string
  active_from: string
  active_to: string | null
  created_at?: string
}

/** Get the currently active prompt version. */
export async function getCurrentPromptVersion(): Promise<PromptVersion | null> {
  const db = getServerSupabase()
  const now = new Date().toISOString()

  const { data } = await db
    .from('prompt_versions')
    .select('*')
    .lte('active_from', now)
    .or(`active_to.is.null,active_to.gt.${now}`)
    .order('active_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as PromptVersion | null
}

/** Get prompt components for current version, or null to use env/defaults. */
export async function getCurrentPrompts(): Promise<{
  systemPrompt: string
  toneRules: string
  bannedPhrases: string
  structure: string
} | null> {
  const version = await getCurrentPromptVersion()
  if (version) {
    return {
      systemPrompt: version.system_prompt,
      toneRules: version.tone_rules,
      bannedPhrases: version.banned_phrases,
      structure: version.structure,
    }
  }
  const systemPrompt = process.env.MRS_DEER_SYSTEM_PROMPT?.trim()
  const toneRules = process.env.MRS_DEER_TONE_RULES?.trim()
  const bannedPhrases = process.env.MRS_DEER_BANNED_PHRASES?.trim()
  if (systemPrompt || toneRules || bannedPhrases) {
    return {
      systemPrompt: systemPrompt || '',
      toneRules: toneRules || '',
      bannedPhrases: bannedPhrases || '',
      structure: '',
    }
  }
  return null
}

function generateNextVersion(current: PromptVersion): {
  system_prompt: string
  tone_rules: string
  banned_phrases: string
  structure: string
} {
  const variations = [
    {
      system_prompt: current.system_prompt.replace(/warm, intuitive/g, 'warm, perceptive'),
      tone_rules: current.tone_rules,
      banned_phrases: current.banned_phrases,
      structure: current.structure,
    },
    {
      system_prompt: current.system_prompt.replace(/intuitive coach/g, 'insightful coach'),
      tone_rules: current.tone_rules,
      banned_phrases: current.banned_phrases,
      structure: current.structure,
    },
    {
      system_prompt: current.system_prompt,
      tone_rules: current.tone_rules.replace(/TONE SIGNALS:/g, 'EMOTIONAL CUES:'),
      banned_phrases: current.banned_phrases,
      structure: current.structure,
    },
  ]
  const nextIndex = current.version_number % variations.length
  return variations[nextIndex]
}

/** Rotate to a new prompt version. */
export async function rotatePrompts(): Promise<{
  success: boolean
  newVersion?: number
}> {
  const db = getServerSupabase()

  try {
    const current = await getCurrentPromptVersion()
    if (!current) {
      return await createInitialPromptVersion()
    }

    await (db.from('prompt_versions') as any).update({ active_to: new Date().toISOString() }).eq('id', current.id)

    const nextData = generateNextVersion(current)
    const { data, error } = await (db.from('prompt_versions') as any)
      .insert({
        version_number: current.version_number + 1,
        ...nextData,
        active_from: new Date().toISOString(),
        active_to: null,
      })
      .select('version_number')
      .single()

    if (error) throw error
    return { success: true, newVersion: (data as { version_number: number })?.version_number }
  } catch (error) {
    console.error('[Prompt Rotation] Error:', error)
    return { success: false }
  }
}

async function createInitialPromptVersion(): Promise<{ success: boolean; newVersion?: number }> {
  const db = getServerSupabase()
  const systemPrompt =
    process.env.MRS_DEER_SYSTEM_PROMPT?.trim() ||
    'You are Mrs. Deer, an AI coach for founders. Warm, steady, wise. Use their exact words. Address their actual tension.'
  const toneRules =
    process.env.MRS_DEER_TONE_RULES?.trim() ||
    'TONE SIGNALS: Burdened, Calm, Curious, Excited, Tired. Match their energy.'
  const bannedPhrases =
    process.env.MRS_DEER_BANNED_PHRASES?.trim() ||
    'BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, clichés.'

  const { data, error } = await (db.from('prompt_versions') as any)
    .insert({
      version_number: 1,
      system_prompt: systemPrompt,
      tone_rules: toneRules,
      banned_phrases: bannedPhrases,
      structure: 'OBSERVE → VALIDATE → REFRAME → QUESTION',
      active_from: new Date().toISOString(),
      active_to: null,
    })
    .select('version_number')
    .single()

  if (error) {
    console.error('[Initial Prompt] Error:', error)
    return { success: false }
  }
  return { success: true, newVersion: (data as { version_number: number })?.version_number }
}
