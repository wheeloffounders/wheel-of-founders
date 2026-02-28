import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmergencyInsight } from '@/lib/personal-coaching'

export async function POST(req: Request) {
  try {
    const { description, severity, userId } = await req.json()

    // Get current user if userId not provided
    let actualUserId = userId
    if (!actualUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        )
      }
      actualUserId = user.id
    }

    // Insert the emergency
    const { data: emergency, error: insertError } = await supabase
      .from('emergencies')
      .insert({
        user_id: actualUserId,
        description,
        severity: severity || 'contained',
        resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Generate insight
    let insight = null
    try {
      insight = await generateEmergencyInsight(
        actualUserId,
        description,
        severity || 'contained',
        new Date().toISOString().split('T')[0]
      )

      // Save insight to the emergency record
      if (insight && emergency?.id) {
        await supabase
          .from('emergencies')
          .update({ insight })
          .eq('id', emergency.id)
      }
    } catch (insightError) {
      console.error('Failed to generate emergency insight:', insightError)
      // Continue without insight - don't fail the whole request
    }

    return NextResponse.json({ 
      success: true, 
      emergency,
      insight 
    })

  } catch (error) {
    console.error('Emergency API error:', error)
    return NextResponse.json(
      { error: 'Failed to create emergency' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('emergencies')
      .select('*, insight')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (id) {
      query = query.eq('id', id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ emergencies: data })

  } catch (error) {
    console.error('Emergency GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergencies' },
      { status: 500 }
    )
  }
}
