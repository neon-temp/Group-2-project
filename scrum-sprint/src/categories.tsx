import { useState, useRef } from 'react'
import type { Resource } from './stashData'

// ── Icons ──────────────────────────────────────────────────────────────────
function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
}
function IconBell() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
}
function IconPlus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function IconEdit() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function IconTrash() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
}
function IconCheck() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function IconX() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ABBR_COLORS: Record<string, string> = {
  general:     'bg-gray-100 text-gray-600',
  work:        'bg-blue-100 text-blue-700',
  learning:    'bg-purple-100 text-purple-700',
  tools:       'bg-teal-100 text-teal-700',
  inspiration: 'bg-orange-100 text-orange-700',
  design:      'bg-blue-100 text-blue-700',
  development: 'bg-teal-100 text-teal-700',
  research:    'bg-purple-100 text-purple-700',
  personal:    'bg-red-100 text-red-500',
  productivity:'bg-green-100 text-green-700',
}
function getAbbrColor(name: string) {
  return ABBR_COLORS[name.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}
function getAbbr(name: string) {
  return name.slice(0, 3).toUpperCase()
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor = 'text-gray-500' }: {
  label: string; value: React.ReactNode; sub?: string; subColor?: string
}) {
  return (
    <div className="min-w-0 flex-1 bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  categories: string[]
  resources: Resource[]
  onAddCategory: (name: string) => Promise<void>
  onRenameCategory: (oldName: string, newName: string) => Promise<void>
  onDeleteCategory: (name: string) => Promise<void>
}

export default function Categories({
  categories,
  resources,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}: Props) {
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const newCatInputRef = useRef<HTMLInputElement>(null)

  function focusNewCatInput() {
    newCatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    newCatInputRef.current?.focus()
  }

  const mostActive = categories.reduce<{ name: string; count: number }>(
    (best, c) => {
      const count = resources.filter(r => r.category === c).length
      return count > best.count ? { name: c, count } : best
    },
    { name: categories[0] ?? '—', count: 0 },
  )

  const filteredCategories = categories.filter(c =>
    c.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  async function handleRename(oldName: string) {
    if (!editValue.trim() || editValue.trim() === oldName) { setEditingName(null); return }
    await onRenameCategory(oldName, editValue.trim())
    setEditingName(null)
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete "${name}"? Resources in this category will move to General.`)) return
    await onDeleteCategory(name)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    setAdding(true)
    try {
      await onAddCategory(newCatName.trim())
      setNewCatName('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-light transition-all">
          <IconSearch />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none flex-1 text-gray-700 placeholder:text-gray-400 text-sm"
            placeholder="Search categories..."
          />
        </div>
        <button className="text-gray-400 hover:text-gray-700 transition-colors p-1"><IconBell /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gray-50">
        {/* Heading */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-400 mt-0.5">Organize and manage your digital workspace structure.</p>
          </div>
          <button
            onClick={focusNewCatInput}
            className="flex items-center gap-2 bg-stash-accent hover:bg-stash-accent-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <IconPlus />
            Create New Category
          </button>
        </div>

        {/* Stats */}
        <div className="stats-stack flex gap-4">
          <StatCard
            label="Total Categories"
            value={<span>{categories.length}</span>}
          />
          <StatCard label="Most Active" value={mostActive.name} sub={`${mostActive.count} resources`} />
          <StatCard
            label="Sync Status"
            value={
              <span className="flex items-center gap-1.5 text-base font-semibold text-gray-800">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                All Cloud Synced
              </span>
            }
          />
          <StatCard label="Total Resources" value={String(resources.length)} />
        </div>

        {/* Category grid */}
        {filteredCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No categories match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredCategories.map(c => {
              const count = resources.filter(r => r.category === c).length
              const isEditing = editingName === c

              return (
              <div
                key={c}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 group hover:border-gray-300 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${getAbbrColor(c)}`}>
                  {getAbbr(c)}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <form
                      onSubmit={e => { e.preventDefault(); handleRename(c) }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="flex-1 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
                      />
                      <button type="submit" className="text-green-600 hover:text-green-700 p-1"><IconCheck /></button>
                      <button type="button" onClick={() => setEditingName(null)} className="text-gray-400 hover:text-gray-600 p-1"><IconX /></button>
                    </form>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900">{c}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{count} Resources</p>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingName(c); setEditValue(c) }}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                    >
                      <IconEdit />
                    </button>
                    {c !== 'General' && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
            })}
          </div>
        )}

        {/* Add new category */}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            ref={newCatInputRef}
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="New category name..."
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all"
          />
          <button
            type="submit"
            disabled={adding || !newCatName.trim()}
            className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <IconPlus />
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
