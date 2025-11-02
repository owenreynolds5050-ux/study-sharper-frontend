import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://study-sharper-backend-production.up.railway.app'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()

    // Forward request to backend with user's access token
    const response = await fetch(`${BACKEND_URL}/api/flashcards`, {
      method: 'POST',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.detail || 'Failed to create flashcard' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error creating flashcard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    const flashcardId = body.id

    if (!flashcardId) {
      return NextResponse.json(
        { error: 'Flashcard ID is required' },
        { status: 400 }
      )
    }

    // Forward request to backend with user's access token
    const response = await fetch(`${BACKEND_URL}/api/flashcards/${flashcardId}`, {
      method: 'PUT',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.detail || 'Failed to update flashcard' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error updating flashcard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    const flashcardId = body.id

    if (!flashcardId) {
      return NextResponse.json(
        { error: 'Flashcard ID is required' },
        { status: 400 }
      )
    }

    // Forward request to backend with user's access token
    const response = await fetch(`${BACKEND_URL}/api/flashcards/${flashcardId}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.detail || 'Failed to delete flashcard' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting flashcard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
