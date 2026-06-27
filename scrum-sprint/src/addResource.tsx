import { useState, useRef, useEffect } from 'react'
import type { Resource, ResourceForm } from './stashData'

type ResourceType = 'url' | 'text'

// ── Icons ──────────────────────────────────────────────────────────────────
function IconClose() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
function IconURL() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
}
function IconSnippet() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
}
function IconFolder() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
}
function IconChevron() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}
function IconSave({ className }: { className?: string }) {
  return <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
}
function IconX() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

// ── Type selector button ───────────────────────────────────────────────────
function TypeButton({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
        active ? 'border-brand bg-brand-light text-brand' : 'border-blue-800 text-blue-800 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  categories: string[]
  editingResource: Resource | null
  onSave: (form: ResourceForm) => Promise<void>
  onClose: () => void
}

export default function AddResourceModal({ categories, editingResource, onSave, onClose }: Props) {
  const isEditing = editingResource !== null

  const [type, setType] = useState<ResourceType>(
    editingResource ? (editingResource.type === 'text' ? 'text' : 'url') : 'url'
  )
  const [url, setUrl] = useState(editingResource?.url ?? '')
  const [title, setTitle] = useState(editingResource?.title ?? '')
  const [category, setCategory] = useState(editingResource?.category ?? (categories[0] ?? ''))
  const [text, setText] = useState(editingResource?.text ?? '')
  const [tags, setTags] = useState<string[]>(editingResource?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function addTag(value: string) {
    const trimmed = value.trim().replace(/^#/, '')
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed])
    setTagInput('')
  }
  function removeTag(tag: string) { setTags(prev => prev.filter(t => t !== tag)) }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput && tags.length) setTags(prev => prev.slice(0, -1))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (type === 'url' && !url.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), type, url: url.trim(), text: text.trim(), category, tags })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Edit Resource' : 'Add New Resource'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Store links, snippets, or images to your personal library.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 -mt-0.5">
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <form id="resource-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Type */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Resource Type</p>
            <div className="flex gap-3">
              <TypeButton label="URL" icon={<IconURL />} active={type === 'url'} onClick={() => setType('url')} />
              <TypeButton label="Snippet" icon={<IconSnippet />} active={type === 'text'} onClick={() => setType('text')} />
            </div>
          </div>

          {/* URL */}
          {type === 'url' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Source URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all"
              />
              <p className="text-xs text-gray-400 mt-1.5 italic">Metadata will be automatically fetched from the URL.</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Resource Title"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all"
            />
          </div>

          {/* Category + Tags */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">Category</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IconFolder /></span>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-8 py-2.5 text-sm text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all cursor-pointer"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconChevron /></span>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">Tags</label>
              <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-10.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-light transition-all">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-brand-light text-brand text-xs font-medium px-2 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70"><IconX /></button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput) addTag(tagInput) }}
                  placeholder={tags.length === 0 ? 'Research,Design,Development...' : ''}
                  className="bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 min-w-15 flex-1"
                />
              </div>
            </div>
          </div>

          {/* Description / Snippet */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              {type === 'text' ? 'Snippet' : 'Description'}{'/ Snippet '}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={type === 'text' ? 'Paste your text snippet here…' : 'Add a brief summary or paste text from the resource...'}
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="resource-form"
            disabled={saving}
            className="w-fit group flex items-center gap-2 bg-brand hover:bg-brand-hover text-white bg-blue-800 text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEditing ? 'Update Resource' : 'Save Resource'}
            {!saving && <IconSave className="text-white transition-colors group-hover:text-blue-100" />}
          </button>
        </div>
      </div>
    </div>
  )
}
