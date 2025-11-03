import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://study-sharper-backend-production.up.railway.app'

// Force dynamic rendering since we access request headers
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    console.log('[API /flashcards/sets] GET request received')
    console.log('[API /flashcards/sets] Auth header present:', !!authHeader)

    // Forward request to backend with user's access token
    const response = await fetch(`${BACKEND_URL}/api/flashcards/sets`, {
      method: 'GET',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
    })

    console.log('[API /flashcards/sets] Backend response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('[API /flashcards/sets] Backend error:', error)
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch flashcard sets' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[API /flashcards/sets] Backend response data:', data)
    console.log('[API /flashcards/sets] Data type:', typeof data)
    console.log('[API /flashcards/sets] Is array?', Array.isArray(data))
    console.log('[API /flashcards/sets] Data length:', data?.length || 'N/A')
    
    return NextResponse.json(data)

  } catch (error) {
    console.error('[API /flashcards/sets] Error fetching flashcard sets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
