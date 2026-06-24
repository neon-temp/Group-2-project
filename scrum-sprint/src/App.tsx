import { useEffect, useState, useMemo, useRef } from 'react'
import { db, auth } from './firebase'
import { collection, addDoc, query, orderBy, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
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

// ========== EMAIL + PASSWORD LOGIN SCREEN ==========
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-sm border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-center">📚 Stash</h1>
        <p className="text-slate-400 text-sm text-center mb-6">Save your resources</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            required 
            placeholder="Email address" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password" 
            required 
            placeholder="Password min 6 chars" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        
        <button 
          onClick={() => {setIsLogin(!isLogin); setError('')}} 
          className="w-full mt-4 text-sm text-slate-400 hover:text-white"
        >
          {isLogin ? "No account? Sign up" : "Have account? Login"}
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
  const [view, setView] = useState(() => localStorage.getItem('stash_view') || 'grid')
  const [sort, setSort] = useState('newest')
  const [showForm, setShowForm] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [optimisticResources, setOptimisticResources] = useState<Resource[]>([])

  const [form, setForm] = useState({ title: '', type: 'url' as 'url' | 'text', url: '', text: '', category: 'General', tags: '' })
  const debouncedSearch = useDebounce(search, 300)
  const searchRef = useRef<HTMLInputElement>(null)

  const openForm = (resource: Resource | null = null) => {
    if (resource) {
      setEditingId(resource.id)
      setForm({ title: resource.title, type: resource.type, url: resource.url || '', text: resource.text || '', category: resource.category, tags: resource.tags.join(', ') })
    } else {
      setEditingId(null)
      setForm({ title: '', type: 'url', url: '', text: '', category: 'General', tags: '' })
    }
    setShowForm(true)
  }
  // ========== AUTH + DATA SUBSCRIPTION ==========
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (u) {
        const q = query(collection(db, `users/${u.uid}/resources`), orderBy('savedAt', 'desc'))
        const unsubData = onSnapshot(q, (snap) => {
          setResources(snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource)))
          setLoading(false)
        })
        return unsubData
      } else {
        setResources([])
        setLoading(false)
      }
    })
    return unsub
  }, [])

  useEffect(() => localStorage.setItem('stash_view', view), [view])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'n' && !showForm && user) openForm()
      if (e.key === 'Escape') setShowForm(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showForm, user])

  

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
      tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      savedAt: editingId ? resources.find(r => r.id === editingId)?.savedAt || new Date().toISOString() : new Date().toISOString()
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
    } catch (err) { alert('Failed to save'); console.error(err) }
    finally { setOptimisticResources([]); setForm({ title: '', type: 'url', url: '', text: '', category: 'General', tags: '' }) }
  }

  const toggleCategory = (cat: string) => {
    if (cat === 'all') setSelectedCategories(['all'])
    else setSelectedCategories(prev => {
      const filtered = prev.filter(c => c !== 'all')
      if (filtered.includes(cat)) {
        const newCats = filtered.filter(c => c !== cat)
        return newCats.length === 0 ? ['all'] : newCats
      }
      return [...filtered, cat]
    })
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return
    setResources(prev => prev.filter(r => r.id !== id))
    if (user) await deleteDoc(doc(db, `users/${user.uid}/resources`, id))
  }

  const filtered = useMemo(() => {
    const all = [...optimisticResources, ...resources]
    const result = all.filter(r => {
      const matchCategory = selectedCategories.includes('all') || selectedCategories.includes(r.category)
      const matchSearch = debouncedSearch === '' ||
        r.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.tags.some(t => t.includes(debouncedSearch.toLowerCase())) ||
        r.text.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.url.toLowerCase().includes(debouncedSearch.toLowerCase())
      return matchCategory && matchSearch
    })
    if (sort === 'newest') result.sort((a,b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    if (sort === 'oldest') result.sort((a,b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
    if (sort === 'az') result.sort((a,b) => a.title.localeCompare(b.title))
    if (sort === 'za') result.sort((a,b) => b.title.localeCompare(a.title))
    return result
  }, [resources, optimisticResources, selectedCategories, debouncedSearch, sort])

  // ========== RENDER FLOW ==========
  if (authLoading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>
  if (!user) return <AuthScreen />

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">📚 Stash</h1>
            <p className="text-slate-400 text-sm">{filtered.length} of {resources.length} resources</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400 hidden md:block">{user.email}</span>
            <button onClick={() => setShowCatManager(true)} className="bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700">Categories</button>
            <button onClick={() => openForm()} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">+ Save <kbd className="text-xs opacity-60 ml-1">N</kbd></button>
            <button onClick={() => signOut(auth)} className="text-slate-400 text-sm hover:text-white">Logout</button>
          </div>
        </div>

        {/* SEARCH + SORT */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input ref={searchRef} type="text" placeholder="Search... Cmd+K" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-800 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-white">✕</button>}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="az">A-Z</option><option value="za">Z-A</option>
          </select>
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="bg-slate-800 px-4 py-3 rounded-lg hover:bg-slate-700">{view === 'grid' ? '⊞ Grid' : '☰ List'}</button>
        </div>

        {/* CATEGORY FILTER */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => toggleCategory('all')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selectedCategories.includes('all') ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}>All ({resources.length})</button>
          {categories.map(cat => {
            const count = resources.filter(r => r.category === cat).length
            return <button key={cat} onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selectedCategories.includes(cat) ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}>{cat} ({count})</button>
          })}
        </div>

        {/* SAVE MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Save'} Resource</h2>
              <form onSubmit={saveResource} className="space-y-4">
                <input required placeholder="Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({...form, type: 'url'})} className={`flex-1 py-2 rounded ${form.type === 'url' ? 'bg-blue-600' : 'bg-slate-700'}`}>URL</button>
                  <button type="button" onClick={() => setForm({...form, type: 'text'})} className={`flex-1 py-2 rounded ${form.type === 'text' ? 'bg-blue-600' : 'bg-slate-700'}`}>Text</button>
                </div>
                {form.type === 'url' ? <input required placeholder="https://example.com *" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" /> : <textarea required placeholder="Paste text snippet *" value={form.text} onChange={e => setForm({...form, text: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-3 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />}
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">{categories.map(c => <option key={c}>{c}</option>)}</select>
                <input placeholder="Tags, comma separated" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 py-3 rounded-lg font-medium hover:bg-blue-700">{editingId ? 'Update' : 'Save'} <kbd className="text-xs opacity-60 ml-1">Enter</kbd></button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-slate-700 rounded-lg hover:bg-slate-600">Esc</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CATEGORY MANAGER MODAL */}
        {showCatManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCatManager(false)}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Categories</h2>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {categories.map(c => <div key={c} className="flex justify-between items-center bg-slate-700 p-2 rounded"><span>{c}</span>{c !== 'General' && <button onClick={() => setCategories(categories.filter(x => x !== c))} className="text-red-400 text-sm hover:text-red-300">Delete</button>}</div>)}
              </div>
              <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {e.preventDefault(); const name=(e.currentTarget.cat as HTMLInputElement).value.trim(); if(name && !categories.includes(name)) setCategories([...categories,name]); e.currentTarget.reset()}} className="flex gap-2">
                <input name="cat" placeholder="New category" className="flex-1 bg-slate-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button className="bg-blue-600 px-4 rounded hover:bg-blue-700">Add</button>
              </form>
              <button onClick={() => setShowCatManager(false)} className="w-full mt-4 bg-slate-700 py-2 rounded hover:bg-slate-600">Close</button>
            </div>
          </div>
        )}

        {/* RESOURCES LIST */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse"><div className="h-4 bg-slate-700 rounded w-1/4 mb-3"></div><div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div><div className="h-4 bg-slate-700 rounded w-full mb-2"></div><div className="h-4 bg-slate-700 rounded w-2/3"></div></div>)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">📦</div><p className="text-xl mb-2">No resources found</p><button onClick={() => {setSearch(''); setSelectedCategories(['all'])}} className="text-blue-400 hover:underline">Clear filters</button></div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map(r => (
              <div key={r.id} className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition group relative">
                {r.id.startsWith('temp_') && <div className="absolute top-2 right-2 text-xs text-yellow-400">Saving...</div>}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded">{r.category}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => openForm(r)} className="text-blue-400 text-sm hover:underline">Edit</button>
                    <button onClick={() => deleteResource(r.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                  </div>
                </div>
                <h3 className="font-medium mb-2 line-clamp-2">{r.title}</h3>
                {r.type === 'url' ? <a href={r.url} target="_blank" className="text-blue-400 text-sm block truncate mb-2 hover:underline">🔗 {r.url}</a> : <p className="text-sm text-slate-300 line-clamp-3 mb-2">📝 {r.text}</p>}
                <div className="flex gap-1 mb-2 flex-wrap">{r.tags.map(t => <button key={t} onClick={() => setSearch(t)} className="text-xs bg-blue-900 hover:bg-blue-800 px-2 py-0.5 rounded">#{t}</button>)}</div>
                <p className="text-xs text-slate-500">{new Date(r.savedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.id} className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 group">
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-xs bg-slate-700 px-2 py-0.5 rounded flex-shrink-0">{r.category}</span>
                      <h3 className="font-medium truncate">{r.title}</h3>
                      {r.id.startsWith('temp_') && <span className="text-xs text-yellow-400">Saving...</span>}
                    </div>
                    {r.type === 'url' ? <a href={r.url} target="_blank" className="text-blue-400 text-sm truncate block hover:underline">🔗 {r.url}</a> : <p className="text-sm text-slate-300 truncate">📝 {r.text}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">{r.tags.map(t => <button key={t} onClick={() => setSearch(t)} className="text-xs text-blue-400 hover:underline">#{t}</button>)}</div>
                  </div>
                  <div className="flex gap-3 ml-4 opacity-0 group-hover:opacity-100">
                    <button onClick={() => openForm(r)} className="text-blue-400 text-sm hover:underline">Edit</button>
                    <button onClick={() => deleteResource(r.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}