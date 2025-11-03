'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FlashcardSet, GenerateFlashcardsRequest, SuggestedFlashcardSet } from '@/types/flashcards'
import { GenerateFlashcardsDialog } from '@/components/notes/GenerateFlashcardsDialog'
import { UnifiedChatInterface } from '@/components/ai/UnifiedChatInterface'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Toast } from '@/components/ui/Toast'
import { generateFlashcards, getFlashcardSets, getSuggestedFlashcards, generateSuggestedFlashcards, deleteFlashcardSet } from '@/lib/api/flashcards'

export default function FlashcardsPage() {
  const router = useRouter()
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [suggestedSets, setSuggestedSets] = useState<SuggestedFlashcardSet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [createMode, setCreateMode] = useState<'ai' | null>(null)
  
  // Error states
  const [setsError, setSetsError] = useState<string | null>(null)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const fetchFlashcardSets = useCallback(async (signal?: AbortSignal) => {
    setSetsError(null)
    setLoading(true)
    
    const result = await getFlashcardSets(signal, { retries: 2, initialDelayMs: 500 })
    
    if (result.ok && result.data) {
      setFlashcardSets(result.data)
      setSetsError(null)
      console.log('[Flashcards] Success:', result.data.length, 'sets')
    } else {
      const errorMsg = result.error || 'Failed to load flashcard sets'
      console.warn('[Flashcards] Failed:', errorMsg)
      setSetsError(errorMsg)
      
      // Keep existing sets on error (don't wipe state)
      if (flashcardSets.length === 0) {
        setFlashcardSets([])
      }
    }
    
    setLoading(false)
  }, [flashcardSets.length])

  const fetchSuggestedSets = useCallback(async (signal?: AbortSignal) => {
    setSuggestionsError(null)
    setLoadingSuggestions(true)
    
    const result = await getSuggestedFlashcards(signal, { retries: 1, initialDelayMs: 300 })
    
    if (result.ok && result.data) {
      setSuggestedSets(result.data.suggestions)
      setSuggestionsError(null)
      console.log('[Flashcards] Suggestions:', result.data.suggestions.length)
    } else {
      const errorMsg = result.error || 'Failed to load suggestions'
      console.warn('[Flashcards] Suggestions failed:', errorMsg)
      setSuggestionsError(errorMsg)
      setSuggestedSets([])
    }
    
    setLoadingSuggestions(false)
  }, [])

  const handleGenerateSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    
    const result = await generateSuggestedFlashcards({ retries: 1 })
    
    if (result.ok) {
      await fetchSuggestedSets()
      setToast({
        message: '✨ Suggestions refreshed!',
        type: 'success'
      })
    } else {
      setToast({
        message: result.error || 'Failed to generate suggestions. Please try again.',
        type: 'error'
      })
    }
    
    setLoadingSuggestions(false)
  }, [fetchSuggestedSets])

  const handleGenerate = useCallback(async (request: GenerateFlashcardsRequest) => {
    setIsGenerating(true)
    setSetsError(null)
    
    const result = await generateFlashcards(request, { retries: 1, initialDelayMs: 1000 })
    
    if (result.ok && result.data) {
      // Show success toast
      setToast({
        message: `✨ Successfully generated ${result.data.total_cards} flashcards!`,
        type: 'success'
      })
      
      // Add the new set to the list immediately (optimistic update)
      setFlashcardSets(prev => [result.data!, ...prev])
      
      // Navigate to the new set after a brief delay to show toast
      setTimeout(() => {
        router.push(`/study/flashcards/${result.data!.id}`)
      }, 1500)
    } else {
      const message = result.error || 'Failed to generate flashcards'
      setToast({
        message: `❌ ${message}. Please try again.`,
        type: 'error'
      })
    }
    
    setIsGenerating(false)
  }, [router])

  const handleDelete = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard set? This cannot be undone.')) {
      return
    }

    try {
      // Optimistic update - remove from UI immediately
      const deletedSet = flashcardSets.find(s => s.id === setId)
      setFlashcardSets(prev => prev.filter(s => s.id !== setId))

      const response = await deleteFlashcardSet(setId)

      if (!response.success) {
        throw new Error('Delete failed')
      }

      // Show success toast
      setToast({
        message: `✅ "${deletedSet?.title}" deleted successfully`,
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to delete flashcard set:', error)
      // Revert optimistic update on error
      await fetchFlashcardSets()
      
      const message = error instanceof Error ? error.message : 'Failed to delete flashcard set'
      setToast({
        message: `❌ ${message}`,
        type: 'error'
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  // Load data on mount
  useEffect(() => {
    // AbortController for cleanup - cancels requests on unmount
    const abortController = new AbortController()
    let isMounted = true

    const loadData = async () => {
      await Promise.allSettled([
        fetchFlashcardSets(abortController.signal),
        fetchSuggestedSets(abortController.signal)
      ])
      
      if (!isMounted) {
        console.log('[Flashcards] Component unmounted, skipping state updates')
      }
    }

    loadData()

    // Cleanup function - prevents state updates after unmount
    return () => {
      console.log('[Flashcards] Cleaning up - aborting pending requests')
      isMounted = false
      abortController.abort()
    }
  }, [fetchFlashcardSets, fetchSuggestedSets])

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Error Banners */}
      {setsError && (
        <ErrorBanner
          title="Failed to Load Flashcards"
          message={setsError}
          onRetry={() => fetchFlashcardSets()}
          variant="error"
        />
      )}
      {suggestionsError && (
        <ErrorBanner
          title="Suggestions Error"
          message={suggestionsError}
          onRetry={() => fetchSuggestedSets()}
          variant="warning"
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/study" 
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-2 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Study Hub
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Flashcards
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI-generated flashcards with spaced repetition for optimal learning
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setCreateMode('ai')
              setIsDialogOpen(true)
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Generate
          </button>
          <Link href="/study/flashcards/create">
            <button
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Manual Create
            </button>
          </Link>
        </div>
      </div>

      {/* Suggested Flashcards Section */}
      {!loadingSuggestions && suggestedSets.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="text-2xl mr-2">✨</span>
                Suggested for You
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI-generated flashcard sets based on your recent notes
              </p>
            </div>
            <button
              onClick={handleGenerateSuggestions}
              disabled={loadingSuggestions}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedSets.slice(0, 4).map((set) => (
              <div
                key={set.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {set.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {set.description}
                </p>
                <Link href={`/study/flashcards/${set.id}`}>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                    Study Now →
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600"></div>
        </div>
      ) : setsError ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-red-300 dark:border-red-800 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <svg className="h-10 w-10 text-red-500 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Flashcards
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {setsError}
          </p>
          <button
            onClick={() => fetchFlashcardSets()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      ) : flashcardSets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <svg className="h-10 w-10 text-blue-500 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            You don’t have any flashcards yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Kickstart your study journey by generating flashcards from your notes or creating a set manually. We’ll track your progress and help you stay consistent.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setCreateMode('ai')
                setIsDialogOpen(true)
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              AI Generate Flashcards
            </button>
            <Link href="/study/flashcards/create">
              <button
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-9 8h10a2 2 0 002-2V6a2 2 0 00-2-2H9l-3 3v13a2 2 0 002 2z" />
                </svg>
                Create Set Manually
              </button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Flashcard Sets Grid */}
      {!loading && flashcardSets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcardSets.map((set) => {
            const progress = set.total_cards > 0 
              ? (set.mastered_cards / set.total_cards) * 100 
              : 0

            return (
              <div
                key={set.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {set.title}
                    </h3>
                    {set.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {set.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(set.id)}
                    className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete set"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cards</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {set.mastered_cards} / {set.total_cards}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {formatDate(set.updated_at)}
                  </div>
                </div>

                {/* Action Button */}
                <Link href={`/study/flashcards/${set.id}`}>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Study Now
                  </button>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Generate Flashcards Dialog */}
      {isDialogOpen && createMode === 'ai' && (
        <GenerateFlashcardsDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setCreateMode(null)
          }}
          onGenerate={handleGenerate}
        />
      )}


      {/* AI Chat Assistant */}
      <UnifiedChatInterface
        chatbotType="flashcard_assistant"
        title="Flashcard Assistant"
        icon="💬"
        placeholder="Ask me to create flashcards..."
        onContentGenerated={(content) => {
          // Refresh flashcard sets when new ones are generated
          fetchFlashcardSets()
        }}
      />
    </div>
  )
}
