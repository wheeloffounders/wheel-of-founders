import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint is meant to be called from the client when the app is stuck
  // It will attempt to clear all caches and return a success status.
  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
      return NextResponse.json({ success: true, message: 'Caches cleared' 
})
    } catch (error) {
      return NextResponse.json({ success: false, error: String(error) }, { 
status: 500 })
    }
  }
  return NextResponse.json({ success: false, message: 'Caches not available' })
}
