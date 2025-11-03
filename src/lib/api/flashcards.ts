import { supabase } from '@/lib/supabase'
import { retryApiCall, type ApiResult, type ApiRetryOptions } from '@/lib/utils/fetchHelpers'
import type {
  GenerateFlashcardsRequest,
  FlashcardSet,
  Flashcard,
  RecordReviewRequest,
  SuggestedFlashcardSet,
  CreateFlashcardSetRequest,
  AIChatMessage,
  AIChatResponse
} from '@/types/flashcards'

async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const headers = new Headers(init.headers || {})

  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include', // Include cookies for session-based auth
    signal: init.signal // Pass through abort signal
  })
}

/**
 * Generate flashcards from notes using AI
 */
export async function generateFlashcards(
  request: GenerateFlashcardsRequest,
  retryOptions?: ApiRetryOptions
): Promise<ApiResult<FlashcardSet>> {
  return retryApiCall(
    async () => {
      const response = await fetchWithAuth('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return {
          ok: false,
          status: response.status,
          data: null,
          error: error?.error || 'Failed to generate flashcards',
        }
      }

      const data = await response.json()
      return { ok: true, status: response.status, data }
    },
    retryOptions
  )
}

/**
 * Delete a flashcard set
 */
export async function deleteFlashcardSet(setId: string): Promise<{ success: boolean }> {
  const response = await fetchWithAuth(`/api/flashcards/sets/${setId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete flashcard set')
  }

  return response.json()
}

/**
 * Fetch all flashcard sets for the current user
 */
export async function getFlashcardSets(
  signal?: AbortSignal,
  retryOptions?: ApiRetryOptions
): Promise<ApiResult<FlashcardSet[]>> {
  return retryApiCall(
    async () => {
      console.log('[getFlashcardSets] getFlashcardSets called')
      console.log('[getFlashcardSets] Starting fetch...')
      // Cache-busting: add timestamp to force fresh fetch
      const timestamp = Date.now()
      const url = `/api/flashcards/sets?t=${timestamp}`
      console.log('[getFlashcardSets] Fetching URL:', url)
      const response = await fetchWithAuth(url, {
        method: 'GET',
        signal,
      })

      console.log('[getFlashcardSets] Response status:', response.status, 'ok:', response.ok)
      console.log('[getFlashcardSets] Raw response:', response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[getFlashcardSets] Error response:', error)
        return {
          ok: false,
          status: response.status,
          data: null,
          error: error?.error || 'Failed to fetch flashcard sets',
        }
      }

      const data = await response.json()
      console.log('[getFlashcardSets] Raw response data:', data)
      console.log('[getFlashcardSets] Data type:', typeof data)
      console.log('[getFlashcardSets] Is array?', Array.isArray(data))
      console.log('[getFlashcardSets] Data length:', data?.length || 'N/A')
      console.log('[getFlashcardSets] Returning data:', data)
      
      return { ok: true, status: response.status, data }
    },
    retryOptions
  )
}

/**
 * Fetch all flashcards in a specific set
 */
export async function getFlashcardsInSet(setId: string): Promise<Flashcard[]> {
  const response = await fetchWithAuth(`/api/flashcards/sets/${setId}/cards`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch flashcards')
  }

  return response.json()
}

/**
 * Record a flashcard review
 */
export async function recordFlashcardReview(
  request: RecordReviewRequest
): Promise<Flashcard> {
  const response = await fetchWithAuth('/api/flashcards/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to record review')
  }

  return response.json()
}

/**
 * Trigger auto-generation of suggested flashcard sets
 */
export async function generateSuggestedFlashcards(
  retryOptions?: ApiRetryOptions
): Promise<ApiResult<{ suggestions: SuggestedFlashcardSet[]; count: number }>> {
  return retryApiCall(
    async () => {
      const response = await fetchWithAuth('/api/flashcards/suggest', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return {
          ok: false,
          status: response.status,
          data: null,
          error: error?.error || 'Failed to generate suggestions',
        }
      }

      const data = await response.json()
      return { ok: true, status: response.status, data }
    },
    retryOptions
  )
}

/**
 * Fetch suggested flashcard sets
 */
export async function getSuggestedFlashcards(
  signal?: AbortSignal,
  retryOptions?: ApiRetryOptions
): Promise<ApiResult<{ suggestions: SuggestedFlashcardSet[]; count: number }>> {
  return retryApiCall(
    async () => {
      const response = await fetchWithAuth('/api/flashcards/suggest', {
        method: 'GET',
        signal,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return {
          ok: false,
          status: response.status,
          data: null,
          error: error?.error || 'Failed to fetch suggestions',
        }
      }

      const data = await response.json()
      return { ok: true, status: response.status, data }
    },
    retryOptions
  )
}

/**
 * Create a blank flashcard set for manual card creation
 */
export async function createBlankFlashcardSet(
  request: CreateFlashcardSetRequest
): Promise<{ success: boolean, set: FlashcardSet }> {
  const response = await fetchWithAuth('/api/flashcards/sets/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create flashcard set')
  }

  return response.json()
}

/**
 * Send a message to the AI chatbot for flashcard generation
 */
export async function sendFlashcardChatMessage(
  message: AIChatMessage
): Promise<AIChatResponse> {
  const response = await fetchWithAuth('/api/flashcards/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Chat request failed')
  }

  return response.json()
}

/**
 * Create a manual flashcard in a set
 */
export async function createManualFlashcard(
  setId: string,
  front: string,
  back: string,
  explanation?: string
): Promise<Flashcard> {
  const response = await fetchWithAuth('/api/flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      set_id: setId,
      front,
      back,
      explanation,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create flashcard')
  }

  return response.json()
}

/**
 * Update a flashcard
 */
export async function updateFlashcard(
  flashcardId: string,
  front?: string,
  back?: string,
  explanation?: string
): Promise<Flashcard> {
  const response = await fetchWithAuth('/api/flashcards', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: flashcardId,
      front,
      back,
      explanation,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to update flashcard')
  }

  return response.json()
}

/**
 * Delete a flashcard
 */
export async function deleteFlashcard(flashcardId: string): Promise<{ success: boolean }> {
  const response = await fetchWithAuth('/api/flashcards', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: flashcardId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete flashcard')
  }

  return response.json()
}
