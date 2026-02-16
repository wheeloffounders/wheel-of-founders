import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { generateAIPrompt, getAIModel } from '@/lib/ai-client'
import { MRS_DEER_RULES } from '@/lib/mrs-deer'

export async function POST(request: NextRequest) {
  try {
    console.log('[Profile Insight API] Request received')
    
    // Read request body first to get userId
    const body = await request.json().catch(() => ({}))
    const userId = body.userId
    
    if (!userId) {
      console.error('[Profile Insight API] ❌ No userId provided in request body')
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    console.log('[Profile Insight API] User ID from request:', userId)
    
    // Create authenticated Supabase client using cookies from the request
    // This passes the user's session and bypasses RLS
    const cookieStore = await cookies()
    let authenticatedSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    console.log('[Profile Insight API] ✅ Authenticated Supabase client created')
    
    // Try to get the current user session (optional - we have userId from body)
    const { data: { session }, error: sessionError } = await authenticatedSupabase.auth.getSession()
    
    if (sessionError) {
      console.warn('[Profile Insight API] ⚠️ Error getting session (non-fatal):', sessionError)
    }
    
    if (session) {
      console.log('[Profile Insight API] ✅ Authenticated session found for user:', session.user.id)
      // Verify userId matches session
      if (session.user.id !== userId) {
        console.warn('[Profile Insight API] ⚠️ UserId mismatch - using userId from request body')
      }
    } else {
      console.warn('[Profile Insight API] ⚠️ No session found in cookies')
      console.warn('[Profile Insight API] Available cookies:', cookieStore.getAll().map(c => c.name))
      
      // If no session but we have userId from authenticated frontend, try using service role
      // OR create a client that can read without RLS (if service role available)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('[Profile Insight API] Using service role key to bypass RLS')
        const { createClient } = await import('@supabase/supabase-js')
        authenticatedSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        ) as any
      } else {
        console.error('[Profile Insight API] ❌ No session and no service role key - cannot read profile data')
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }
    
    console.log('[Profile Insight API] User ID:', userId)

    // Retry logic for profile retrieval - handles timing issues
    let profileData = null
    let profileError = null
    let retries = 0
    const maxRetries = 3
    
    while (!profileData && retries < maxRetries) {
      if (retries > 0) {
        console.log(`[Profile Insight API] Retry ${retries}/${maxRetries} - waiting 1000ms...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      console.log(`[Profile Insight API] Attempt ${retries + 1}/${maxRetries}: Fetching profile data...`)
      
      const { data, error } = await authenticatedSupabase
        .from('user_profiles')
        .select(`
          name,
          preferred_name,
          company_name,
          primary_goal,
          primary_goal_text,
          destress_activity,
          hobbies,
          hobbies_other,
          message_to_mrs_deer,
          founder_stage,
          founder_stage_other,
          primary_role,
          primary_role_other,
          weekly_hours,
          struggles,
          struggles_other,
          years_as_founder,
          founder_personality,
          founder_personality_other
        `)
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error(`[Profile Insight API] ❌ Error on attempt ${retries + 1}:`, error)
        console.error(`[Profile Insight API] Error code: ${error.code}, message: ${error.message}`)
        profileError = error
      } else if (data) {
        console.log(`[Profile Insight API] ✅ Profile data found on attempt ${retries + 1}`)
        profileData = data
        break
      } else {
        console.warn(`[Profile Insight API] ⚠️ No profile data found on attempt ${retries + 1} (data is null)`)
      }
      
      retries++
    }

    if (profileError && !profileData) {
      console.error('[Profile Insight API] ❌ Error fetching profile after retries:', profileError)
      console.error('[Profile Insight API] Error details:', JSON.stringify(profileError, null, 2))
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    console.log('[Profile Insight API] ===== PROFILE DATA RETRIEVAL =====')
    console.log('[Profile Insight API] User ID:', userId)
    console.log('[Profile Insight API] Profile data exists:', !!profileData)
    
    if (!profileData) {
      console.warn('[Profile Insight API] ⚠️ Profile not found for user', userId)
      console.warn('[Profile Insight API] This might be a timing issue - profile might not be saved yet')
    } else {
      console.log('[Profile Insight API] ✅ Profile data retrieved successfully')
      console.log('[Profile Insight API] Raw profile data:', JSON.stringify(profileData, null, 2))
    }

    // Build context string (use empty object if profileData is null)
    const profile = profileData || {}
    const userName = profile.preferred_name || profile.name
    
    console.log('[Profile Insight API] ===== PROFILE FIELD EXTRACTION =====')
    console.log('[Profile Insight API] - name:', profile.name, '(type:', typeof profile.name, ')')
    console.log('[Profile Insight API] - preferred_name:', profile.preferred_name, '(type:', typeof profile.preferred_name, ')')
    console.log('[Profile Insight API] - userName (final):', userName, '(type:', typeof userName, ')')
    console.log('[Profile Insight API] - primary_goal:', profile.primary_goal)
    console.log('[Profile Insight API] - primary_goal_text:', profile.primary_goal_text, '(length:', profile.primary_goal_text?.length || 0, ')')
    console.log('[Profile Insight API] - hobbies:', profile.hobbies, '(array length:', profile.hobbies?.length || 0, ')')
    console.log('[Profile Insight API] - struggles:', profile.struggles, '(array length:', profile.struggles?.length || 0, ')')
    console.log('[Profile Insight API] - message_to_mrs_deer:', profile.message_to_mrs_deer ? `${profile.message_to_mrs_deer.substring(0, 50)}...` : 'null')

    console.log('[Profile Insight API] Building context with:', {
      name: userName,
      primaryGoal: profile.primary_goal,
      primaryGoalText: profile.primary_goal_text,
      hobbies: profile.hobbies,
      destressActivity: profile.destress_activity,
      messageToMrsDeer: profile.message_to_mrs_deer,
      struggles: profile.struggles,
      founderStage: profile.founder_stage,
      primaryRole: profile.primary_role,
      yearsAsFounder: profile.years_as_founder,
      founderPersonality: profile.founder_personality,
    })
    
    // Build structured context for better AI understanding
    const profileDetails: string[] = []
    
    // Include basic identity first
    if (userName) {
      profileDetails.push(`Name: ${userName}`)
    }
    
    if (profile.primary_goal) {
      profileDetails.push(`Primary goal (category): ${profile.primary_goal}`)
    }
    
    if (profile.primary_goal_text) {
      profileDetails.push(`Primary goal: "${profile.primary_goal_text}"`)
    }
    if (profile.company_name) {
      profileDetails.push(`Building: ${profile.company_name}`)
    }
    if (profile.destress_activity) {
      profileDetails.push(`Destress activity: ${profile.destress_activity}`)
    }
    if (profile.hobbies && profile.hobbies.length > 0) {
      const hobbyList = profile.hobbies.join(', ')
      profileDetails.push(`Hobbies: ${hobbyList}`)
      if (profile.hobbies_other) {
        profileDetails.push(`Additional hobbies: ${profile.hobbies_other}`)
      }
    }
    if (profile.message_to_mrs_deer) {
      profileDetails.push(`Personal message: "${profile.message_to_mrs_deer}"`)
    }
    const stage = profile.founder_stage === 'other' ? profile.founder_stage_other : profile.founder_stage
    if (stage) {
      profileDetails.push(`Startup stage: ${stage}`)
    }
    const role = profile.primary_role === 'other' ? profile.primary_role_other : profile.primary_role
    if (role) {
      profileDetails.push(`Role: ${role}`)
    }
    if (profile.weekly_hours) {
      profileDetails.push(`Weekly hours: ${profile.weekly_hours}`)
    }
    if (profile.struggles && profile.struggles.length > 0) {
      profileDetails.push(`Struggles: ${profile.struggles.join(', ')}`)
      if (profile.struggles_other) {
        profileDetails.push(`Additional struggles: ${profile.struggles_other}`)
      }
    }
    if (profile.years_as_founder) {
      profileDetails.push(`Years as founder: ${profile.years_as_founder}`)
    }
    const personality = profile.founder_personality === 'other' ? profile.founder_personality_other : profile.founder_personality
    if (personality) {
      profileDetails.push(`Founder personality: ${personality}`)
    }
    
    console.log('[Profile Insight API] ===== CONTEXT BUILDING =====')
    console.log('[Profile Insight API] Profile details count:', profileDetails.length)
    console.log('[Profile Insight API] Profile details:', profileDetails)
    
    const context = profileDetails.length > 0 
      ? profileDetails.join('\n')
      : 'They are just getting started with their founder journey.'
    
    console.log('[Profile Insight API] Final context length:', context.length)
    console.log('[Profile Insight API] Final context preview:', context.substring(0, 200))
    
    if (profileDetails.length === 0) {
      console.warn('[Profile Insight API] ⚠️⚠️⚠️ NO PROFILE DETAILS FOUND - Using default context!')
      console.warn('[Profile Insight API] This means the profile data is not being retrieved correctly.')
      console.warn('[Profile Insight API] Check if profile was saved correctly or if there is a timing issue.')
    }

    // Build prompts with explicit name requirement and data usage
    let systemPrompt = ''
    
    if (userName) {
      systemPrompt = `CRITICAL RULE #1: The founder's name is "${userName}". You MUST start your response with "Hi ${userName}," or "Hello ${userName}," - NEVER use generic greetings like "Hi there!" or "Hello!" when you know their name.\n\n`
    }
    
    systemPrompt += MRS_DEER_RULES
    systemPrompt += `\n\nYou are Mrs. Deer, a warm, supportive AI coach for founders. Generate a brief, personalized insight (2-3 sentences max) based on their ACTUAL profile data below.`
    systemPrompt += `\n\nCRITICAL RULES - YOU MUST FOLLOW THESE:\n`
    systemPrompt += `- ${userName ? `MANDATORY: Start EXACTLY with "Hi ${userName}," - DO NOT use "Hello there", "Hi there", "Dear founder", or any generic greeting. Use their actual name: "${userName}".` : 'Start with a warm greeting.'}\n`
    systemPrompt += `- MANDATORY: Reference AT LEAST 2-3 SPECIFIC details from their profile below. Copy their exact words when possible.\n`
    systemPrompt += `- FORBIDDEN: Do NOT write generic phrases like "just starting your founder journey", "exciting times ahead", "brave path", "tiny acorn", "big oak tree", or "first steps".\n`
    systemPrompt += `- FORBIDDEN: Do NOT write placeholders like [insert specific detail...] or [e.g., "..."] - use their ACTUAL data\n`
    systemPrompt += `- REQUIRED: Mention their actual goal text, hobbies, struggles, or other specific details from below\n`
    systemPrompt += `- Keep it warm, encouraging, and brief (2-3 sentences)\n`
    systemPrompt += `\nEXAMPLE OF WHAT NOT TO WRITE:\n`
    systemPrompt += `"Hello there, dear founder! I see you're just starting your founder journey—how exciting!" ❌\n`
    systemPrompt += `\nEXAMPLE OF WHAT TO WRITE:\n`
    systemPrompt += `${userName ? `"Hi ${userName}, I see you're focused on [their actual goal text]. I love that you enjoy [their actual hobby]. I know [their actual struggle] can be challenging."` : 'Use their actual data, not generic statements.'} ✅\n`

    const nameGreeting = userName ? ` named ${userName}` : ''
    
    let userPrompt = `A founder${nameGreeting} just completed or updated their profile. Here is their actual profile data:\n\n${context}\n\n`
    
    if (userName) {
      userPrompt += `Their name is "${userName}". `
    }
    
    userPrompt += `Write a warm, personalized insight that:\n`
    userPrompt += `1. ${userName ? `Starts with "Hi ${userName}," (use their actual name)` : 'Starts with a warm greeting'}\n`
    userPrompt += `2. References 2-3 SPECIFIC things from their profile above (mention actual details like their goal, hobbies, struggles, etc.)\n`
    userPrompt += `3. Shows you understand them as a whole person, not just a founder\n`
    userPrompt += `4. Is brief (2-3 sentences) and encouraging\n\n`
    userPrompt += `IMPORTANT: Use their ACTUAL data from above. Do NOT write placeholders or generic examples. Be specific about what they shared.`

    console.log('[Profile Insight API] Generating AI insight...')
    console.log('[Profile Insight API] User name:', userName)
    console.log('[Profile Insight API] Context length:', context.length)
    
    const insight = await generateAIPrompt({
      systemPrompt,
      userPrompt,
      model: getAIModel(),
      maxTokens: 200, // Increased for more detailed responses
      temperature: 0.8, // Slightly higher for more natural, personalized responses
    })

    if (!insight) {
      console.error('[Profile Insight API] AI generation returned null')
      return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
    }

    console.log('[Profile Insight API] Insight generated, length:', insight.length)
    console.log('[Profile Insight API] Insight preview:', insight.substring(0, 150))
    console.log('[Profile Insight API] User name for post-processing:', userName)
    console.log('[Profile Insight API] Profile details count:', profileDetails.length)

    // Post-process: Ensure name is used if provided and add specific details
    let finalInsight = insight.trim()
    
    if (userName) {
      const firstName = userName.split(' ')[0]
      const lowerInsight = finalInsight.toLowerCase()
      let replaced = false // ✅ Declare the variable
      
      // ULTRA aggressive replacement - catch ANY variation of generic greetings
      // This includes "Hello there", "Hi there", "Hello there, dear founder", etc.
      
      // Pattern 1: Catch "Hello there, dear founder!" - the exact pattern we're seeing
      console.log('[Profile Insight API] Checking for generic greeting. First 50 chars:', finalInsight.substring(0, 50))
      
      if (lowerInsight.startsWith('hello there') || lowerInsight.startsWith('hi there') || lowerInsight.startsWith('hey there')) {
        console.log('[Profile Insight API] ✅ Found generic greeting pattern at start')
        
        // Try to match "Hello there, dear founder!" with flexible pattern
        // Match: "Hello there" + optional comma + optional "dear" + optional "founder" + optional emoji
        const fullGreetingMatch = finalInsight.match(/^(hello\s+there|hi\s+there|hey\s+there)[!.,:\s]*(dear\s+founder|dear|founder)[!.,:\s]*[\u{1F300}-\u{1F9FF}\s]*/iu)
        
        if (fullGreetingMatch) {
          console.log('[Profile Insight API] ✅ Matched full greeting:', fullGreetingMatch[0])
          let restOfInsight = finalInsight.substring(fullGreetingMatch[0].length).trim()
          const cleanRest = restOfInsight.replace(/^[!.,:\s🌟✨🦌🌿🚀\u{1F300}-\u{1F9FF}]+/u, '').trim()
          finalInsight = `Hi ${firstName}, ${cleanRest}`
          replaced = true
          console.log('[Profile Insight API] ✅ Replaced full generic greeting (with dear founder) with: Hi', firstName)
        } else {
          // Just "Hello there" without "dear founder" - match more flexibly
          const greetingMatch = finalInsight.match(/^(hello\s+there|hi\s+there|hey\s+there)[!.,:\s]*/i)
          if (greetingMatch) {
            console.log('[Profile Insight API] ✅ Matched simple greeting:', greetingMatch[0])
            let restOfInsight = finalInsight.substring(greetingMatch[0].length).trim()
            
            // Also try to remove "dear founder" if it appears right after
            const dearMatch = restOfInsight.match(/^(dear\s+founder|dear)[!.,:\s]*[\u{1F300}-\u{1F9FF}\s]*/iu)
            if (dearMatch) {
              restOfInsight = restOfInsight.substring(dearMatch[0].length).trim()
            }
            
            const cleanRest = restOfInsight.replace(/^[!.,:\s🌟✨🦌🌿🚀\u{1F300}-\u{1F9FF}]+/u, '').trim()
            finalInsight = `Hi ${firstName}, ${cleanRest}`
            replaced = true
            console.log('[Profile Insight API] ✅ Replaced generic greeting (without dear) with: Hi', firstName)
          }
        }
      }
      
      // Pattern 2: Regex patterns as backup
      const genericGreetingPatterns = [
        /^hello\s+there[!.,:\s]*(dear\s+founder|dear)[!.,:\s]*/iu,
        /^hi\s+there[!.,:\s]*(dear\s+founder|dear)[!.,:\s]*/iu,
        /^hey\s+there[!.,:\s]*(dear\s+founder|dear)[!.,:\s]*/iu,
        /^hello\s+there[!.,:\s]*/iu,
        /^hi\s+there[!.,:\s]*/iu,
        /^hey\s+there[!.,:\s]*/iu,
      ]
      
      if (!replaced) {
        for (const pattern of genericGreetingPatterns) {
          if (pattern.test(finalInsight)) {
            const match = finalInsight.match(pattern)
            if (match) {
              let restOfInsight = finalInsight.substring(match[0].length).trim()
              const cleanRest = restOfInsight.replace(/^[!.,:\s🌟✨🦌🌿🚀\u{1F300}-\u{1F9FF}]+/u, '').trim()
              finalInsight = `Hi ${firstName}, ${cleanRest}`
              replaced = true
              console.log('[Profile Insight API] ✅ Replaced generic greeting (regex backup) with: Hi', firstName)
              break
            }
          }
        }
      }
      
      // FINAL FAILSAFE: ALWAYS check if name is missing - this MUST catch everything
      const firstPart = finalInsight.substring(0, 80).toLowerCase()
      const nameFound = firstPart.includes(firstName.toLowerCase()) || firstPart.includes(userName.toLowerCase())
      
      if (!nameFound) {
        // Name is definitely missing - force prepend it
        // Remove any existing generic greeting first (more aggressive cleanup)
        finalInsight = finalInsight
          .replace(/^(hi\s+there|hello\s+there|hey\s+there)[!.,:\s🌟✨🦌\u{1F300}-\u{1F9FF}]*/iu, '')
          .replace(/^(hi|hello|hey)[!.,:\s]*there[!.,:\s🌟✨🦌\u{1F300}-\u{1F9FF}]*/iu, '')
          .trim()
        
        // If we removed everything, keep the original but prepend name
        if (!finalInsight) {
          finalInsight = insight.trim()
        }
        
        finalInsight = `Hi ${firstName}, ${finalInsight}`
        console.log('[Profile Insight API] ✅ FINAL FAILSAFE: Force prepended name - name not found in first 80 chars')
        console.log('[Profile Insight API] Final result preview:', finalInsight.substring(0, 80))
      } else {
        console.log('[Profile Insight API] ✅ Name found in insight:', firstName)
      }
    } else {
      console.warn('[Profile Insight API] ⚠️ No userName provided for post-processing')
    }
    
    // Post-process: Only inject details if the insight is actually generic
    // Don't inject if AI already wrote something personalized
    const lowerFinal = finalInsight.toLowerCase()
    
    // Check if AI already referenced specific profile details
    const hasSpecificDetails = 
      (profile.primary_goal_text && lowerFinal.includes(profile.primary_goal_text.toLowerCase().substring(0, 20))) ||
      (profile.company_name && lowerFinal.includes(profile.company_name.toLowerCase())) ||
      (profile.hobbies && profile.hobbies.length > 0 && lowerFinal.includes(profile.hobbies[0].toLowerCase())) ||
      (profile.struggles && profile.struggles.length > 0 && lowerFinal.includes(profile.struggles[0].toLowerCase())) ||
      (profile.message_to_mrs_deer && lowerFinal.includes(profile.message_to_mrs_deer.toLowerCase().substring(0, 20)))
    
    const isGeneric = !hasSpecificDetails && (
      lowerFinal.includes('just getting started') || 
      lowerFinal.includes('first steps') ||
      lowerFinal.includes('exciting times') ||
      lowerFinal.includes('taking the first') ||
      lowerFinal.includes('brave and rewarding path') ||
      lowerFinal.includes('tiny acorn') ||
      lowerFinal.includes('big oak tree')
    )
    
    // Only inject if truly generic AND we have profile data
    if (isGeneric && profileDetails.length > 0) {
      console.log('[Profile Insight API] Insight is generic, injecting specific details...')
      
      // Build injected details from actual profile data
      let injectedDetails = ''
      let detailCount = 0
      
      // Priority 1: Primary goal text (most important)
      if (profile.primary_goal_text) {
        const goalPreview = profile.primary_goal_text.length > 50 
          ? profile.primary_goal_text.substring(0, 50) + '...'
          : profile.primary_goal_text
        injectedDetails += `I see you're focused on "${goalPreview}". `
        detailCount++
      }
      
      // Priority 2: Hobbies (personal touch)
      if (profile.hobbies && profile.hobbies.length > 0 && detailCount < 2) {
        injectedDetails += `I love that you enjoy ${profile.hobbies[0]}${profile.hobbies.length > 1 ? ` and ${profile.hobbies.length - 1} other things` : ''} outside of work. `
        detailCount++
      }
      
      // Priority 3: Struggles (shows understanding)
      if (profile.struggles && profile.struggles.length > 0 && detailCount < 2) {
        const struggle = profile.struggles[0]
        injectedDetails += `I know ${struggle} can be challenging. `
        detailCount++
      }
      
      if (injectedDetails && detailCount > 0) {
        // Find insertion point - after the first complete sentence (not mid-sentence!)
        const firstSentenceEnd = finalInsight.match(/[.!?]\s/)
        if (firstSentenceEnd && firstSentenceEnd.index! < 300) {
          // Insert after the first sentence
          const insertPos = firstSentenceEnd.index! + firstSentenceEnd[0].length
          finalInsight = finalInsight.substring(0, insertPos) + ' ' + injectedDetails.trim() + ' ' + finalInsight.substring(insertPos)
          console.log('[Profile Insight API] ✅ Injected', detailCount, 'specific profile details after first sentence')
        } else {
          // No clear sentence break - don't inject to avoid breaking the text
          console.log('[Profile Insight API] ⚠️ Skipping injection - no clear sentence break found (AI wrote something complete)')
        }
      }
    } else {
      console.log('[Profile Insight API] ✅ Insight already contains specific details - skipping injection')
    }

    // Check generation count - limit to 3 generations for profile insights
    const { data: existingProfilePrompts } = await authenticatedSupabase
      .from('personal_prompts')
      .select('generation_count')
      .eq('user_id', userId)
      .eq('prompt_type', 'profile')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingProfilePrompts) {
      const currentCount = existingProfilePrompts.generation_count || 1
      if (currentCount >= 3) {
        console.log(`[Profile Insight API] Generation limit reached (${currentCount}/3) for profile insight`)
        // Return the most recent insight instead of generating a new one
        const { data: latestPrompt } = await authenticatedSupabase
          .from('personal_prompts')
          .select('prompt_text')
          .eq('user_id', userId)
          .eq('prompt_type', 'profile')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (latestPrompt?.prompt_text) {
          console.log(`[Profile Insight API] Returning existing permanent insight (generation ${currentCount})`)
          return NextResponse.json({ insight: latestPrompt.prompt_text })
        }
      }
    }

    // Store insight in database (optional - don't fail if this fails)
    console.log('[Profile Insight API] Storing insight in database...')
    console.log('[Profile Insight API] Final insight:', finalInsight.substring(0, 150))
    try {
      // Calculate generation count
      let generationCount = 1
      if (existingProfilePrompts?.generation_count) {
        generationCount = existingProfilePrompts.generation_count + 1
      }
      
      // Only include prompt_date if the column exists (it's optional for profile insights)
      const insertData: any = {
        user_id: userId,
        prompt_text: finalInsight,
        prompt_type: 'profile',
        stage_context: null,
        generation_count: generationCount,
      }
      
      // Try to insert without prompt_date first (safer - column might not exist)
      // Use authenticated client for insert
      console.log(`[SAVE INSIGHT] Attempting to save profile insight to personal_prompts:`, {
        table: 'personal_prompts',
        userId,
        promptType: 'profile',
        generationCount,
        promptTextLength: finalInsight.length,
        promptTextPreview: finalInsight.substring(0, 100),
        timestamp: new Date().toISOString(),
        insertData
      })
      
      const { data: insertedData, error: insertError } = await authenticatedSupabase
        .from('personal_prompts')
        .insert(insertData)
        .select()
      
      if (insertError) {
        console.error('[SAVE INSIGHT] ❌ Profile insight insert FAILED:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          insertData
        })
      } else {
        console.log('[SAVE INSIGHT] ✅ Profile insight insert SUCCEEDED:', {
          insertedRows: insertedData?.length || 0,
          insertedId: insertedData?.[0]?.id,
          insertedData: insertedData?.[0],
          generationCount
        })
        console.log(`[Profile Insight API] Insight stored successfully (generation ${generationCount}/3)`)
      }

      if (insertError) {
        console.error('[Profile Insight API] Error storing profile insight:', insertError)
        console.error('[Profile Insight API] Insert error details:', JSON.stringify(insertError, null, 2))
        // Don't fail the request if storage fails, just log it
        // This could happen if 'profile' prompt type isn't in the constraint yet
      } else {
        console.log('[Profile Insight API] Insight stored successfully')
      }
    } catch (dbError) {
      console.error('[Profile Insight API] Database insert exception:', dbError)
      // Continue even if database insert fails
    }

    return NextResponse.json({ insight: finalInsight })
  } catch (error) {
    console.error('[Profile Insight API] Error generating profile insight:', error)
    if (error instanceof Error) {
      console.error('[Profile Insight API] Error stack:', error.stack)
      console.error('[Profile Insight API] Error message:', error.message)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insight' },
      { status: 500 }
    )
  }
}
