'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Flashcard } from '@/types/flashcards'
import { getFlashcardsInSet, recordFlashcardReview, deleteFlashcard } from '@/lib/api/flashcards'
import { EditCardDialog } from '@/components/flashcards/EditCardDialog'

interface PageProps {
  params: Promise<{ setId: string }> | { setId: string }
}

export default function FlashcardStudyPage({ params }: PageProps) {
  const router = useRouter()
  const [setId, setSetId] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userAnswer, setUserAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    skipped: 0,
    total: 0
  })
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Handle both Promise and plain object params
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params
      setSetId(resolvedParams.setId)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (setId) {
      fetchFlashcards()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId])

  const fetchFlashcards = async () => {
    if (!setId) return
    
    try {
      setLoading(true)
      const cards = await getFlashcardsInSet(setId)
      
      if (cards.length === 0) {
        alert('No cards available in this set!')
        router.push('/study/flashcards')
        return
      }
      
      // Shuffle cards for varied practice
      const shuffled = [...cards].sort(() => Math.random() - 0.5)
      setFlashcards(shuffled)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Failed to fetch flashcards:', error)
      alert('Failed to load flashcards. Please try again.')
      router.push('/study/flashcards')
    } finally {
      setLoading(false)
    }
  }

  const currentCard = flashcards[currentIndex]
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0

  const resetCardState = () => {
    setUserAnswer('')
    setShowAnswer(false)
    setShowHint(false)
    setAttempts(0)
  }

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return

    const correctAnswer = currentCard.back.toLowerCase().trim()
    const userAnswerLower = userAnswer.toLowerCase().trim()

    if (correctAnswer.includes(userAnswerLower) || userAnswerLower.includes(correctAnswer)) {
      // Correct answer
      handleCorrect()
    } else {
      // Incorrect - increment attempts
      setAttempts(prev => prev + 1)
      alert('❌ Not quite! Try again or use a hint.')
    }
  }

  const handleCorrect = async () => {
    try {
      await recordFlashcardReview({
        flashcard_id: currentCard.id,
        correct: true
      })

      setSessionStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        total: prev.total + 1
      }))

      alert('✅ Correct!')
      handleNextCard()
    } catch (error) {
      console.error('Failed to record review:', error)
    }
  }

  const handleSkip = async () => {
    try {
      await recordFlashcardReview({
        flashcard_id: currentCard.id,
        correct: false
      })

      setSessionStats(prev => ({
        ...prev,
        skipped: prev.skipped + 1,
        total: prev.total + 1
      }))

      handleNextCard()
    } catch (error) {
      console.error('Failed to record review:', error)
    }
  }

  const handleReveal = () => {
    setShowAnswer(true)
  }

  const handleGetHint = () => {
    setShowHint(true)
  }

  const handleNextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      resetCardState()
    } else {
      // Session complete
      const accuracy = sessionStats.total > 0 
        ? Math.round((sessionStats.correct / sessionStats.total) * 100)
        : 0
      alert(
        `🎉 Session Complete!\n\n` +
        `Correct: ${sessionStats.correct + 1}\n` +
        `Skipped: ${sessionStats.skipped}\n` +
        `Total: ${sessionStats.total + 1}\n` +
        `Accuracy: ${accuracy}%`
      )
      router.push('/study/flashcards')
    }
  }

  const handleEditCard = () => {
    setEditingCard(currentCard)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = (updatedCard: Flashcard) => {
    // Update the card in the flashcards array
    setFlashcards(prev => 
      prev.map(card => card.id === updatedCard.id ? updatedCard : card)
    )
    setIsEditDialogOpen(false)
  }

  const handleDeleteCard = async () => {
    if (!currentCard) return
    
    if (!confirm('Are you sure you want to delete this card? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteFlashcard(currentCard.id)
      
      // Remove card from flashcards array
      const updatedFlashcards = flashcards.filter(card => card.id !== currentCard.id)
      
      if (updatedFlashcards.length === 0) {
        alert('All cards deleted. Returning to flashcard sets.')
        router.push('/study/flashcards')
        return
      }
      
      setFlashcards(updatedFlashcards)
      
      // Adjust current index if needed
      if (currentIndex >= updatedFlashcards.length) {
        setCurrentIndex(Math.max(0, updatedFlashcards.length - 1))
      }
      
      resetCardState()
    } catch (error) {
      console.error('Failed to delete card:', error)
      alert('Failed to delete card. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    if (loading) return
    
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmitAnswer()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAnswer, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No flashcards found</p>
          <Link href="/study/flashcards" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Flashcards
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link 
            href="/study/flashcards"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sets
          </Link>

          {/* Session Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              ✓ {sessionStats.correct}
            </div>
            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              ⏭️ {sessionStats.skipped}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Card {currentIndex + 1} of {flashcards.length}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard Question */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {currentCard.front}
            </h2>
            {attempts > 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Attempts: {attempts}
              </p>
            )}
            {/* Edit/Delete Buttons */}
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={handleEditCard}
                disabled={isDeleting}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
              >
                ✏️ Edit
              </button>
              <button
                onClick={handleDeleteCard}
                disabled={isDeleting}
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                {isDeleting ? '🗑️ Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>

          {/* Answer Input */}
          {!showAnswer && (
            <div className="space-y-4">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitAnswer()
                  }
                }}
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!userAnswer.trim()}
                  className="flex-1 min-w-[120px] px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  ✓ Submit Answer
                </button>
                <button
                  onClick={handleGetHint}
                  className="px-6 py-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-medium"
                >
                  💡 Get Hint
                </button>
                <button
                  onClick={handleReveal}
                  className="px-6 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
                >
                  👁️ Reveal Answer
                </button>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  ⏭️ Skip Card
                </button>
              </div>
            </div>
          )}

          {/* Show Hint */}
          {showHint && !showAnswer && currentCard.explanation && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">💡 Hint:</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">{currentCard.explanation}</p>
            </div>
          )}

          {/* Show Answer */}
          {showAnswer && (
            <div className="space-y-4">
              <div className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">✅ Correct Answer:</p>
                <p className="text-lg text-green-800 dark:text-green-300 font-medium">{currentCard.back}</p>
                {currentCard.explanation && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400">{currentCard.explanation}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleNextCard}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Continue to Next Card →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Card Dialog */}
      <EditCardDialog
        isOpen={isEditDialogOpen}
        card={editingCard}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
