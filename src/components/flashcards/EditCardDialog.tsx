'use client'

import { useState } from 'react'
import { updateFlashcard } from '@/lib/api/flashcards'
import type { Flashcard } from '@/types/flashcards'

interface EditCardDialogProps {
  isOpen: boolean
  card: Flashcard | null
  onClose: () => void
  onSuccess: (updatedCard: Flashcard) => void
}

export function EditCardDialog({ isOpen, card, onClose, onSuccess }: EditCardDialogProps) {
  const [front, setFront] = useState(card?.front || '')
  const [back, setBack] = useState(card?.back || '')
  const [explanation, setExplanation] = useState(card?.explanation || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update local state when card changes
  if (card && (front !== card.front || back !== card.back)) {
    setFront(card.front)
    setBack(card.back)
    setExplanation(card.explanation || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!front.trim() || !back.trim()) {
      setError('Front and back are required')
      return
    }

    if (!card) return

    setIsUpdating(true)
    setError(null)
    try {
      const updatedCard = await updateFlashcard(
        card.id,
        front.trim(),
        back.trim(),
        explanation.trim() || undefined
      )

      onSuccess(updatedCard)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update card'
      setError(message)
      console.error('Failed to update flashcard:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!isOpen || !card) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              ✏️ Edit Card
            </h2>
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Front (Question) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Front (Question) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="What is the question or prompt?"
              required
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {front.length}/500 characters
            </p>
          </div>

          {/* Back (Answer) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Back (Answer) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="What is the answer or explanation?"
              required
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {back.length}/1000 characters
            </p>
          </div>

          {/* Explanation (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Explanation / Hint (Optional)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Add additional context, mnemonics, or hints..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!front.trim() || !back.trim() || isUpdating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                '💾 Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
