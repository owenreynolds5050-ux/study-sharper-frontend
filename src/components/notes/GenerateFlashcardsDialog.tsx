'use client'

import { useState, useEffect } from 'react'
import type { GenerateFlashcardsRequest, DifficultyLevel } from '@/types/flashcards'
import { DIFFICULTY_LABELS } from '@/types/flashcards'
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  title: string
  content?: string
  created_at: string
}

interface GenerateFlashcardsDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (request: GenerateFlashcardsRequest) => Promise<void>
}

export function GenerateFlashcardsDialog({
  isOpen,
  onClose,
  onGenerate
}: GenerateFlashcardsDialogProps) {
  const [step, setStep] = useState<'select' | 'configure'>('select')
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [numCards, setNumCards] = useState(10)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium')
  const [setTitle, setSetTitle] = useState('')
  const [setDescription, setSetDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch notes when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchNotes()
      setStep('select')
      setSelectedNoteIds([])
      setSearchQuery('')
    }
  }, [isOpen])

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true)
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Failed to fetch notes:', error)
      setNotes([])
    } finally {
      setLoadingNotes(false)
    }
  }

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    )
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleContinue = () => {
    if (selectedNoteIds.length === 0) return
    setStep('configure')
  }

  const handleBack = () => {
    setStep('select')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedNoteIds.length === 0) return
    
    setIsGenerating(true)
    try {
      const request: GenerateFlashcardsRequest = {
        note_ids: selectedNoteIds,
        num_cards: numCards,
        difficulty,
        set_title: setTitle.trim() || undefined,
        set_description: setDescription.trim() || undefined
      }
      
      await onGenerate(request)
      onClose()
      
      // Reset form
      setStep('select')
      setSelectedNoteIds([])
      setNumCards(10)
      setDifficulty('medium')
      setSetTitle('')
      setSetDescription('')
      setSearchQuery('')
    } catch (error) {
      console.error('Failed to generate flashcards:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const selectedNotes = notes.filter(note => selectedNoteIds.includes(note.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🪄 Generate Flashcards
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {step === 'select' ? 'Step 1: Select Notes' : 'Step 2: Configure'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Loading State */}
              {loadingNotes && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading notes...</p>
                </div>
              )}

              {/* Notes List */}
              {!loadingNotes && filteredNotes.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchQuery ? 'No notes found matching your search.' : 'No notes yet. Upload some notes first!'}
                  </p>
                </div>
              )}

              {!loadingNotes && filteredNotes.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredNotes.map((note) => (
                    <label
                      key={note.id}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedNoteIds.includes(note.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNoteIds.includes(note.id)}
                        onChange={() => toggleNoteSelection(note.id)}
                        className="mt-1 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {note.title}
                        </p>
                        {note.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                            {note.content.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Selected Count */}
              {selectedNoteIds.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    ✓ {selectedNoteIds.length} {selectedNoteIds.length === 1 ? 'note' : 'notes'} selected
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'configure' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected Notes Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  📝 {selectedNotes.length} {selectedNotes.length === 1 ? 'Note' : 'Notes'} Selected
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-2">
                  {selectedNotes.map(n => n.title).join(', ')}
                </p>
              </div>

            {/* Number of Cards */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Flashcards
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="5"
                  value={numCards}
                  onChange={(e) => setNumCards(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-lg font-semibold text-gray-900 dark:text-white w-8">
                  {numCards}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Level
              </label>
              <div className="space-y-2">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                  <label
                    key={level}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      difficulty === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={difficulty === level}
                      onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      {DIFFICULTY_LABELS[level]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional: Custom Set Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Set Title (Optional)
              </label>
              <input
                type="text"
                value={setTitle}
                onChange={(e) => setSetTitle(e.target.value)}
                placeholder="Leave blank for auto-generated title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Optional: Set Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={setDescription}
                onChange={(e) => setSetDescription(e.target.value)}
                placeholder="Add notes about this flashcard set..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

              {/* Estimated time */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                ⏱️ Generation takes ~5-10 seconds
              </p>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {step === 'select' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={selectedNoteIds.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </>
            )}
            {step === 'configure' && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isGenerating}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    '✨ Generate Flashcards'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
