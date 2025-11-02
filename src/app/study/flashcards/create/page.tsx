'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Flashcard, FlashcardSet } from '@/types/flashcards'
import { createBlankFlashcardSet, createManualFlashcard, updateFlashcard, deleteFlashcard } from '@/lib/api/flashcards'

interface CardData {
  id: string
  front: string
  back: string
  explanation?: string
  isNew: boolean
}

export default function CreateFlashcardPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cards, setCards] = useState<CardData[]>([
    { id: '1', front: '', back: '', isNew: true }
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const addCard = useCallback(() => {
    const newId = Math.random().toString(36).substr(2, 9)
    setCards(prev => [...prev, { id: newId, front: '', back: '', isNew: true }])
  }, [])

  const deleteCard = useCallback((id: string) => {
    if (cards.length === 1) {
      setError('You must have at least one card')
      return
    }
    setCards(prev => prev.filter(card => card.id !== id))
  }, [cards.length])

  const updateCard = useCallback((id: string, field: 'front' | 'back' | 'explanation', value: string) => {
    setCards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, [field]: value } : card
      )
    )
  }, [])

  const moveCard = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= cards.length) return
    const newCards = [...cards]
    const [movedCard] = newCards.splice(fromIndex, 1)
    newCards.splice(toIndex, 0, movedCard)
    setCards(newCards)
  }, [cards.length])

  const validateForm = (): boolean => {
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return false
    }

    if (cards.length === 0) {
      setError('You must have at least one card')
      return false
    }

    const hasValidCards = cards.some(card => card.front.trim() && card.back.trim())
    if (!hasValidCards) {
      setError('At least one card must have both a term and definition')
      return false
    }

    return true
  }

  const handleCreate = async (andPractice: boolean = false) => {
    if (!validateForm()) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Create the flashcard set
      const setResult = await createBlankFlashcardSet({
        title: title.trim(),
        description: description.trim() || undefined
      })

      const setId = setResult.set.id

      // Filter out empty cards and create them
      const validCards = cards.filter(card => card.front.trim() && card.back.trim())

      for (const card of validCards) {
        await createManualFlashcard(
          setId,
          card.front.trim(),
          card.back.trim(),
          card.explanation?.trim() || undefined
        )
      }

      setSuccessMessage(`✅ Created "${title}" with ${validCards.length} card${validCards.length !== 1 ? 's' : ''}!`)

      // Redirect after a brief delay
      setTimeout(() => {
        if (andPractice) {
          router.push(`/study/flashcards/${setId}`)
        } else {
          router.push('/study/flashcards')
        }
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create flashcard set'
      setError(message)
      console.error('Failed to create flashcards:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/study/flashcards"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Flashcard Set</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleCreate(false)}
              disabled={isSaving}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => handleCreate(true)}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save & Practice</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">❌ {error}</p>
          </div>
        )}
        {successMessage && (
          <div className="max-w-6xl mx-auto px-4 py-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
        {/* Set Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Set Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Spanish Vocabulary, Biology Chapter 5"
                maxLength={200}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg font-semibold"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this flashcard set..."
                maxLength={500}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description.length}/500 characters
              </p>
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Cards ({cards.length})
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {cards.filter(c => c.front.trim() && c.back.trim()).length} filled
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={card.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  {/* Card Number */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </span>
                  </div>

                  {/* Card Inputs */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Front (Term) */}
                    <input
                      type="text"
                      value={card.front}
                      onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                      placeholder="Enter term..."
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />

                    {/* Back (Definition) */}
                    <input
                      type="text"
                      value={card.back}
                      onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                      placeholder="Enter definition..."
                      maxLength={1000}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />

                    {/* Explanation */}
                    <input
                      type="text"
                      value={card.explanation || ''}
                      onChange={(e) => updateCard(card.id, 'explanation', e.target.value)}
                      placeholder="Add explanation (optional)..."
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center space-x-2">
                    {/* Move Up */}
                    <button
                      onClick={() => moveCard(index, index - 1)}
                      disabled={index === 0}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                      </svg>
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => moveCard(index, index + 1)}
                      disabled={index === cards.length - 1}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v12m0 0l-4-4m4 4l4-4" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteCard(card.id)}
                      disabled={cards.length === 1}
                      className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Delete card"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Card Button */}
          <button
            onClick={addCard}
            className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Card</span>
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>💡 Tip:</strong> You can add cards before creating the set. Only cards with both a term and definition will be saved.
          </p>
        </div>
        </div>
      </div>

    </div>
  )
}
