import { useEffect, useState, useMemo, useRef } from 'react'
import { db, auth } from './firebase'
import {
  collection,
  addDoc,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'

const DEFAULT_CATEGORIES = ['General', 'Work', 'Learning', 'Tools', 'Inspiration']

type Resource = {
  id: string
  title: string
  type: 'url' | 'text'
  url: string
  text: string
  category: string
  tags: string[]
  savedAt: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        if (password.length < 6) throw new Error('Password must be at least 6 characters')
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stash-bg flex items-center justify-center p-4">
      <div className="bg-stash-surface rounded-2xl p-8 w-full max-w-md border border-stash-border shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stash-accent/15 text-stash-accent text-2xl mb-4">
            📚
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Stash</h1>
          <p className="text-stash-muted mt-1">Your personal resource library</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-label={isLogin ? 'Login form' : 'Sign up form'}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stash-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stash-muted mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent focus:border-transparent"
            />
          </div>
          {error && (
            <p role="alert" className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stash-accent py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin)
            setError('')
          }}
          className="w-full mt-4 text-sm text-stash-muted hover:text-white transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all'])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [view, setView] = useState(() => localStorage.getItem('stash_view') || 'grid')
  const [sort, setSort] = useState('newest')
  const [showForm, setShowForm] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [optimisticResources, setOptimisticResources] = useState<Resource[]>([])
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [categoryEditValue, setCategoryEditValue] = useState('')

  const [form, setForm] = useState({
    title: '',
    type: 'url' as 'url' | 'text',
    url: '',
    text: '',
    category: 'General',
    tags: '',
  })

  const debouncedSearch = useDebounce(search, 300)
  const searchRef = useRef<HTMLInputElement>(null)

  const formTags = useMemo(
    () => form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    [form.tags],
  )

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    resources.forEach((r) => r.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [resources])

  const hasActiveFilters =
    debouncedSearch !== '' ||
    !selectedCategories.includes('all') ||
    selectedTags.length > 0

  const openForm = (resource: Resource | null = null) => {
    if (resource) {
      setEditingId(resource.id)
      setForm({
        title: resource.title,
        type: resource.type,
        url: resource.url || '',
        text: resource.text || '',
        category: resource.category,
        tags: resource.tags.join(', '),
      })
    } else {
      setEditingId(null)
      setForm({ title: '', type: 'url', url: '', text: '', category: 'General', tags: '' })
    }
    setShowForm(true)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) {
        setResources([])
        setLoading(false)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, `users/${user.uid}/resources`), orderBy('savedAt', 'desc'))
    const unsubResources = onSnapshot(q, (snap) => {
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource)))
      setLoading(false)
    })

    const catRef = doc(db, `users/${user.uid}/settings/categories`)
    const unsubCategories = onSnapshot(catRef, async (snap) => {
      if (snap.exists()) {
        setCategories(snap.data().names as string[])
      } else {
        await setDoc(catRef, { names: DEFAULT_CATEGORIES })
      }
    })

    return () => {
      unsubResources()
      unsubCategories()
    }
  }, [user])

  useEffect(() => localStorage.setItem('stash_view', view), [view])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'n' && !showForm && !isTyping && user) openForm()
      if (e.key === 'Escape') {
        setShowForm(false)
        setShowCatManager(false)
        setEditingCategory(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showForm, user])

  const saveCategories = async (names: string[]) => {
    if (!user) return
    await setDoc(doc(db, `users/${user.uid}/settings/categories`), { names })
  }
 
  const addCategory = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || categories.includes(trimmed)) return
    await saveCategories([...categories, trimmed])
  }

  const renameCategory = async (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed || categories.includes(trimmed)) return
    if (!user) return

    const updated = categories.map((c) => (c === oldName ? trimmed : c))
    await saveCategories(updated)

    const toUpdate = resources.filter((r) => r.category === oldName)
    await Promise.all(
      toUpdate.map((r) =>
        updateDoc(doc(db, `users/${user.uid}/resources`, r.id), { category: trimmed }),
      ),
    )
    setEditingCategory(null)
  }

  const deleteCategory = async (name: string) => {
    if (name === 'General' || !user) return
    if (!confirm(`Delete "${name}"? Resources in this category will move to General.`)) return

    const toUpdate = resources.filter((r) => r.category === name)
    await Promise.all(
      toUpdate.map((r) =>
        updateDoc(doc(db, `users/${user.uid}/resources`, r.id), { category: 'General' }),
      ),
    )
    await saveCategories(categories.filter((c) => c !== name))
    if (selectedCategories.includes(name)) {
      setSelectedCategories((prev) => {
        const next = prev.filter((c) => c !== name)
        return next.length === 0 ? ['all'] : next
      })
    }
  }

  const saveResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('Title is required')
    if (form.type === 'url' && !form.url.trim()) return alert('URL is required')
    if (form.type === 'text' && !form.text.trim()) return alert('Text snippet is required')

    const data = {
      title: form.title.trim(),
      type: form.type,
      url: form.type === 'url' ? form.url.trim() : '',
      text: form.type === 'text' ? form.text.trim() : '',
      category: form.category,
      tags: formTags,
      savedAt: editingId
        ? resources.find((r) => r.id === editingId)?.savedAt || new Date().toISOString()
        : new Date().toISOString(),
    }

    const tempId = editingId || 'temp_' + Date.now()
    setOptimisticResources([{ id: tempId, ...data }])
    setShowForm(false)

    try {
      if (editingId && user) {
        await updateDoc(doc(db, `users/${user.uid}/resources`, editingId), data)
      } else if (user) {
        await addDoc(collection(db, `users/${user.uid}/resources`), data)
      }
    } catch (err) {
      alert('Failed to save')
      console.error(err)
    } finally {
      setOptimisticResources([])
      setForm({ title: '', type: 'url', url: '', text: '', category: 'General', tags: '' })
    }
  }

  const toggleCategory = (cat: string) => {
    if (cat === 'all') setSelectedCategories(['all'])
    else
      setSelectedCategories((prev) => {
        const filtered = prev.filter((c) => c !== 'all')
        if (filtered.includes(cat)) {
          const newCats = filtered.filter((c) => c !== cat)
          return newCats.length === 0 ? ['all'] : newCats
        }
        return [...filtered, cat]
      })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedCategories(['all'])
    setSelectedTags([])
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return
    setResources((prev) => prev.filter((r) => r.id !== id))
    if (user) await deleteDoc(doc(db, `users/${user.uid}/resources`, id))
  }

  const filtered = useMemo(() => {
    const all = [...optimisticResources, ...resources]
    const result = all.filter((r) => {
      const matchCategory =
        selectedCategories.includes('all') || selectedCategories.includes(r.category)
      const matchTags =
        selectedTags.length === 0 || selectedTags.some((t) => r.tags.includes(t))
      const q = debouncedSearch.toLowerCase()
      const matchSearch =
        q === '' ||
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)) ||
        r.text.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q)
      return matchCategory && matchTags && matchSearch
    })

    if (sort === 'newest')
      result.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    if (sort === 'oldest')
      result.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
    if (sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'za') result.sort((a, b) => b.title.localeCompare(a.title))
    return result
  }, [resources, optimisticResources, selectedCategories, selectedTags, debouncedSearch, sort])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stash-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stash-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-stash-muted text-sm">Loading Stash…</p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <div className="min-h-screen bg-stash-bg text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stash-accent/15 flex items-center justify-center text-lg">
                📚
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Stash</h1>
                <p className="text-stash-muted text-sm">
                  {filtered.length} of {resources.length} resources
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-stash-muted hidden md:block truncate max-w-45">
              {user.email}
            </span>
            <button
              type="button"
              onClick={() => setShowCatManager(true)}
              className="bg-stash-surface border border-stash-border px-4 py-2 rounded-lg hover:bg-stash-elevated transition-colors"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => openForm()}
              className="bg-stash-accent px-4 py-2 rounded-lg font-medium hover:bg-stash-accent-hover transition-colors"
            >
              + Save Resource
              <kbd className="hidden sm:inline text-xs opacity-60 ml-1.5 px-1 py-0.5 rounded bg-white/10">N</kbd>
            </button>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="text-stash-muted text-sm hover:text-white px-2 py-2 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Search & controls */}
        <section aria-label="Search and sort" className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <label htmlFor="search" className="sr-only">
              Search resources
            </label>
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stash-subtle pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchRef}
              id="search"
              type="search"
              placeholder="Search by title or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stash-surface border border-stash-border rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent focus:border-transparent transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stash-subtle hover:text-white p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort resources"
            className="bg-stash-surface border border-stash-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">Title A–Z</option>
            <option value="za">Title Z–A</option>
          </select>
          <button
            type="button"
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            className="bg-stash-surface border border-stash-border px-4 py-2.5 rounded-xl hover:bg-stash-elevated transition-colors whitespace-nowrap"
          >
            {view === 'grid' ? '☰ List' : '⊞ Grid'}
          </button>
        </section>

        {/* Category filters */}
        <section aria-label="Filter by category" className="mb-4">
          <p className="text-xs font-medium text-stash-subtle uppercase tracking-wider mb-2">Categories</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => toggleCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategories.includes('all')
                  ? 'bg-stash-accent text-white border-stash-accent'
                  : 'bg-stash-surface border border-stash-border text-stash-muted hover:bg-stash-elevated hover:text-white'
              }`}
            >
              All ({resources.length})
            </button>
            {categories.map((cat) => {
              const count = resources.filter((r) => r.category === cat).length
              const active = selectedCategories.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-stash-accent text-white border border-stash-accent'
                      : 'bg-stash-surface border border-stash-border text-stash-muted hover:bg-stash-elevated hover:text-white'
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>
        </section>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <section aria-label="Filter by tags" className="mb-5">
            <p className="text-xs font-medium text-stash-subtle uppercase tracking-wider mb-2">Tags</p>
            <div className="flex gap-2 flex-wrap">
              {allTags.map((tag) => {
                const count = resources.filter((r) => r.tags.includes(tag)).length
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      active
                        ? 'bg-stash-tag text-stash-tag-text ring-1 ring-indigo-400/50'
                        : 'bg-stash-elevated text-stash-muted hover:text-stash-tag-text hover:bg-stash-tag/40'
                    }`}
                  >
                    #{tag} ({count})
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-3 mb-5 px-3 py-2 bg-stash-surface border border-stash-border rounded-lg text-sm">
            <span className="text-stash-muted">Showing filtered results</span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-stash-accent hover:text-stash-accent-hover font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Save modal */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowForm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-resource-title"
          >
            <div
              className="bg-stash-surface border border-stash-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="save-resource-title" className="text-xl font-semibold mb-5">
                {editingId ? 'Edit Resource' : 'Save Resource'}
              </h2>
              <form onSubmit={saveResource} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-stash-muted mb-1.5">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="title"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-stash-muted mb-1.5">Type</span>
                  <div className="flex gap-2" role="group" aria-label="Resource type">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'url' })}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${
                        form.type === 'url'
                          ? 'bg-stash-accent border-stash-accent'
                          : 'bg-stash-elevated border-stash-border hover:border-stash-subtle'
                      }`}
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'text' })}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${
                        form.type === 'text'
                          ? 'bg-stash-accent border-stash-accent'
                          : 'bg-stash-elevated border-stash-border hover:border-stash-subtle'
                      }`}
                    >
                      Text snippet
                    </button>
                  </div>
                </div>

                {form.type === 'url' ? (
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-stash-muted mb-1.5">
                      URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="url"
                      required
                      placeholder="https://example.com"
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="text" className="block text-sm font-medium text-stash-muted mb-1.5">
                      Content <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Paste your text snippet here…"
                      value={form.text}
                      onChange={(e) => setForm({ ...form, text: e.target.value })}
                      className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-stash-accent"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-stash-muted mb-1.5">
                    Category
                  </label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-stash-muted mb-1.5">
                    Tags <span className="text-stash-subtle font-normal">(comma separated)</span>
                  </label>
                  <input
                    id="tags"
                    placeholder="react, tutorial, reference"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full bg-stash-elevated border border-stash-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-stash-accent"
                  />
                  {formTags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {formTags.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-stash-tag text-stash-tag-text px-2 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-stash-accent py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover transition-colors"
                  >
                    {editingId ? 'Update Resource' : 'Save Resource'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 bg-stash-elevated border border-stash-border rounded-lg hover:bg-stash-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category manager */}
        {showCatManager && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowCatManager(false)
              setEditingCategory(null)
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="categories-title"
          >
            <div
              className="bg-stash-surface border border-stash-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="categories-title" className="text-xl font-semibold mb-1">
                Manage Categories
              </h2>
              <p className="text-sm text-stash-muted mb-5">
                Group related resources together. Deleting a category moves its resources to General.
              </p>

              <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
                {categories.map((c) => (
                  <div
                    key={c}
                    className="flex justify-between items-center gap-2 bg-stash-elevated border border-stash-border p-2.5 rounded-lg"
                  >
                    {editingCategory === c ? (
                      <form
                        className="flex flex-1 gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          renameCategory(c, categoryEditValue)
                        }}
                      >
                        <input
                          autoFocus
                          value={categoryEditValue}
                          onChange={(e) => setCategoryEditValue(e.target.value)}
                          className="flex-1 bg-stash-surface border border-stash-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-stash-accent"
                        />
                        <button type="submit" className="text-stash-accent text-sm font-medium">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="text-stash-muted text-sm"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="font-medium">{c}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(c)
                              setCategoryEditValue(c)
                            }}
                            className="text-stash-accent text-sm hover:underline"
                          >
                            Edit
                          </button>
                          {c !== 'General' && (
                            <button
                              type="button"
                              onClick={() => deleteCategory(c)}
                              className="text-red-400 text-sm hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault()
                  const name = (e.currentTarget.cat as HTMLInputElement).value.trim()
                  if (name) addCategory(name)
                  e.currentTarget.reset()
                }}
                className="flex gap-2"
              >
                <input
                  name="cat"
                  placeholder="New category name"
                  aria-label="New category name"
                  className="flex-1 bg-stash-elevated border border-stash-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stash-accent"
                />
                <button
                  type="submit"
                  className="bg-stash-accent px-4 py-2 rounded-lg font-medium hover:bg-stash-accent-hover transition-colors"
                >
                  Add
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowCatManager(false)
                  setEditingCategory(null)
                }}
                className="w-full mt-4 bg-stash-elevated border border-stash-border py-2.5 rounded-lg hover:bg-stash-surface transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Library */}
        <main aria-label="Resource library">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-stash-surface border border-stash-border rounded-xl p-5 animate-pulse"
                >
                  <div className="h-5 bg-stash-elevated rounded w-1/4 mb-3" />
                  <div className="h-6 bg-stash-elevated rounded w-3/4 mb-2" />
                  <div className="h-4 bg-stash-elevated rounded w-full mb-2" />
                  <div className="h-4 bg-stash-elevated rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="text-5xl mb-4 opacity-80">{resources.length === 0 ? '📚' : '🔍'}</div>
              <p className="text-xl font-medium mb-2">
                {resources.length === 0 ? 'Your library is empty' : 'No resources found'}
              </p>
              <p className="text-stash-muted mb-6 max-w-sm mx-auto">
                {resources.length === 0
                  ? 'Save your first URL or text snippet to start building your personal resource library.'
                  : 'Try adjusting your search or filters to find what you need.'}
              </p>
              {resources.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openForm()}
                  className="bg-stash-accent px-5 py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover transition-colors"
                >
                  Save your first resource
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-stash-accent hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <article
                  key={r.id}
                  className="bg-stash-surface border border-stash-border rounded-xl p-5 hover:border-stash-subtle transition-colors group relative"
                >
                  {r.id.startsWith('temp_') && (
                    <span className="absolute top-3 right-3 text-xs text-amber-400 font-medium">
                      Saving…
                    </span>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium bg-stash-elevated text-stash-muted px-2.5 py-1 rounded-full">
                      {r.category}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openForm(r)}
                        className="text-stash-accent text-xs font-medium hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteResource(r.id)}
                        className="text-red-400 text-xs font-medium hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 line-clamp-2 leading-snug">{r.title}</h3>
                  {r.type === 'url' ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stash-accent text-sm block truncate mb-3 hover:underline"
                    >
                      {r.url}
                    </a>
                  ) : (
                    <p className="text-sm text-stash-muted line-clamp-3 mb-3 leading-relaxed">
                      {r.text}
                    </p>
                  )}
                  {r.tags.length > 0 && (
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      {r.tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTag(t)}
                          className="text-xs bg-stash-tag text-stash-tag-text px-2 py-0.5 rounded-full hover:ring-1 hover:ring-indigo-400/40 transition-all"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                  <time
                    dateTime={r.savedAt}
                    className="text-xs text-stash-subtle"
                  >
                    Saved {new Date(r.savedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <article
                  key={r.id}
                  className="bg-stash-surface border border-stash-border rounded-xl p-4 hover:border-stash-subtle transition-colors group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center mb-1.5">
                        <span className="text-xs font-medium bg-stash-elevated text-stash-muted px-2 py-0.5 rounded-full">
                          {r.category}
                        </span>
                        <h3 className="font-semibold truncate">{r.title}</h3>
                        {r.id.startsWith('temp_') && (
                          <span className="text-xs text-amber-400">Saving…</span>
                        )}
                      </div>
                      {r.type === 'url' ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stash-accent text-sm truncate block hover:underline"
                        >
                          {r.url}
                        </a>
                      ) : (
                        <p className="text-sm text-stash-muted truncate">{r.text}</p>
                      )}
                      {r.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {r.tags.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleTag(t)}
                              className="text-xs text-stash-tag-text hover:underline"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}
                      <time dateTime={r.savedAt} className="text-xs text-stash-subtle mt-1.5 block">
                        Saved {new Date(r.savedAt).toLocaleDateString()}
                      </time>
                    </div>
                    <div className="flex gap-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openForm(r)}
                        className="text-stash-accent text-sm font-medium hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteResource(r.id)}
                        className="text-red-400 text-sm font-medium hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
