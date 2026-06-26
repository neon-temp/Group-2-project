import { useEffect, useState, useMemo } from 'react'
import { db, auth } from './firebase'
import {
  collection, addDoc, query, orderBy, deleteDoc, doc, onSnapshot, setDoc
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'

const DEFAULT_CATEGORIES = ['Design', 'Development', 'Research', 'Personal']

type Resource = {
  id: string
  title: string
  url: string
  text: string
  category: string
  tags: string[]
  savedAt: string
  type: 'url' | 'text' | 'image'
  readTime?: string
  format?: string
}

type ResourceType = 'url' | 'text' | 'image'

const ICONS = {
  library: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>,
  categories: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  tags: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  settings: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  back: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  external: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  trash: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  edit: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  folder: <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password)
      else await createUserWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.replace('Firebase: ', ''))
      } else {
        setError('An unexpected error occurred')
      }
    }
  }

  return (
    <div className="min-h-screen bg-stash-bg flex items-center justify-center p-4">
      <div className="bg-stash-surface rounded-2xl p-8 w-full max-w-md border-stash-border">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-stash-accent flex items-center justify-center text-white font-bold">S</div>
          <h1 className="text-2xl font-bold">Stash</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-stash-accent outline-none" />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-stash-accent outline-none" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button className="w-full bg-stash-accent text-white py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover">{isLogin? 'Sign in' : 'Sign up'}</button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-stash-muted hover:text-stash-accent">{isLogin? "No account? Sign up" : 'Have account? Sign in'}</button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [view, setView] = useState<'dashboard' | 'resource' | 'categories'>('dashboard')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showSavePopup, setShowSavePopup] = useState(false)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({ title: '', url: '', text: '', category: 'Design', tags: '', type: 'url' as ResourceType })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); if (!u) setResources([]) })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    const unsubRes = onSnapshot(query(collection(db, `users/${user.uid}/resources`), orderBy('savedAt', 'desc')), snap => {
      setResources(snap.docs.map(d => ({ id: d.id,...d.data() } as Resource)))
    })
    const catRef = doc(db, `users/${user.uid}/settings/categories`)
    const unsubCat = onSnapshot(catRef, async snap => {
      if (snap.exists()) setCategories(snap.data().names)
      else await setDoc(catRef, { names: DEFAULT_CATEGORIES })
    })
    return () => { unsubRes(); unsubCat() }
  }, )

  const saveResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('Title required')
    const data = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), savedAt: new Date().toISOString() }
    await addDoc(collection(db, `users/${user!.uid}/resources`), data)
    setShowSavePopup(false)
    setForm({ title: '', url: '', text: '', category: 'Design', tags: '', type: 'url' })
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return
    await deleteDoc(doc(db, `users/${user!.uid}/resources`, id))
    setView('dashboard')
  }

  const addCategory = async (name: string) => {
    const newCats = [...categories, name]
    setCategories(newCats)
    await setDoc(doc(db, `users/${user!.uid}/settings/categories`), { names: newCats })
  }

  const deleteCategory = async (name: string) => {
    if (name === 'Design') return alert('Cannot delete default category')
    const newCats = categories.filter(c => c !== name)
    setCategories(newCats)
    await setDoc(doc(db, `users/${user!.uid}/settings/categories`), { names: newCats })
  }

  const filtered = useMemo(() => {
    if (!search) return resources
    const q = search.toLowerCase()
    return resources.filter(r => r.title.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
  }, [resources, search])

  const stats = {
    total: resources.length,
    categories: categories.length,
    tags: [...new Set(resources.flatMap(r => r.tags))].length,
    completion: resources.length > 0 ? Math.round((resources.filter(r => r.text).length / resources.length) * 100) : 0
  }

  if (authLoading) return <div className="min-h-screen bg-stash-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-stash-accent border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <AuthScreen />

  return (
    <div className="min-h-screen bg-stash-bg text-stash-text flex">
      {/* Sidebar - Figma Dashboard */}
      <aside className="w-64 bg-stash-surface border-r border-stash-border flex-col p-4 fixed h-full">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-stash-accent flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-bold text-lg">Stash</span>
        </div>

        <nav className="space-y-1 flex-1">
          <button onClick={() => { setView('dashboard'); setSelectedResource(null) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${view === 'dashboard'? 'bg-stash-accent/20 text-stash-accent' : 'hover:bg-stash-elevated text-stash-muted'}`}>
            {ICONS.library} Library
          </button>
          <button onClick={() => setView('categories')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${view === 'categories'? 'bg-stash-accent/20 text-stash-accent' : 'hover:bg-stash-elevated text-stash-muted'}`}>
            {ICONS.categories} Categories
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stash-elevated text-stash-muted">{ICONS.tags} Tags</button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stash-elevated text-stash-muted">{ICONS.settings} Settings</button>
        </nav>
        <button onClick={() => signOut(auth)} className="w-full bg-stash-accent text-white py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover mb-4">Sign Out</button>

        <button onClick={() => setShowSavePopup(true)} className="w-full bg-stash-accent text-white py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover mb-4">+ Add Resource</button>
        <div className="text-xs text-stash-subtle px-2">Storage Status: {stats.total} items</div>
      </aside>

      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        {/* 1. DASHBOARD - Figma Screen 1 */}
        {view === 'dashboard' && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-stash-surface border-stash-border rounded-xl p-5"><p className="text-stash-muted text-sm mb-1">Total Resources</p><p className="text-3xl font-bold">{stats.total.toLocaleString()}</p></div>
              <div className="bg-stash-surface border-stash-border rounded-xl p-5"><p className="text-stash-muted text-sm mb-1">Categories</p><p className="text-3xl font-bold">{stats.categories}</p></div>
              <div className="bg-stash-surface border-stash-border rounded-xl p-5"><p className="text-stash-muted text-sm mb-1">Tags Used</p><p className="text-3xl font-bold">{stats.tags}</p></div>
              <div className="bg-stash-surface border-stash-border rounded-xl p-5"><p className="text-stash-muted text-sm mb-1">Completion</p><p className="text-3xl font-bold">{stats.completion}%</p></div>
            </div>

            {/* Search + Sort */}
            <div className="flex gap-3 mb-6">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..." className="flex-1 bg-stash-surface border-stash-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-stash-accent outline-none" />
              <select className="bg-stash-surface border-stash-border rounded-lg px-4 py-2.5"><option>Sort by Date</option></select>
            </div>

            {/* Resource List or Empty State */}
            {filtered.length === 0 ? (
              // 3. EMPTY STATE - Figma Screen 3
              <div className="bg-stash-surface border-stash-border rounded-xl p-16 text-center">
                <div className="text-stash-subtle mb-4 flex justify-center">{ICONS.folder}</div>
                <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
                <p className="text-stash-muted mb-6">You haven't saved any resources yet. Add your first link, snippet, or image to get started.</p>
                <button onClick={() => setShowSavePopup(true)} className="bg-stash-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover">Add Resource</button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(r => (
                  <div key={r.id} onClick={() => { setSelectedResource(r); setView('resource') }} className="bg-stash-surface border-stash-border rounded-xl p-5 hover:border-stash-accent cursor-pointer transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{r.title}</h3>
                        <p className="text-sm text-stash-muted line-clamp-2 mb-2">{r.text || r.url}</p>
                        <div className="flex gap-2 items-center text-xs text-stash-subtle">
                          <span className="bg-stash-elevated px-2 py-0.5 rounded">{r.category}</span>
                          <span>{new Date(r.savedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 hover:opacity-100">
                        <button onClick={e => { e.stopPropagation(); setSelectedResource(r); setView('resource') }} className="text-stash-accent text-sm">{ICONS.edit}</button>
                        <button onClick={e => { e.stopPropagation(); deleteResource(r.id) }} className="text-red-400 text-sm">{ICONS.trash}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-center text-stash-subtle text-sm mt-8">Drop files or paste a link to add a resource</p>
          </>
        )}

        {/* 2. RESOURCE DETAILS - Figma Screen 2 */}
        {view === 'resource' && selectedResource && (
          <div>
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-stash-muted hover:text-stash-text mb-6">{ICONS.back} Library / {selectedResource.category} / {selectedResource.title}</button>
            
            <div className="bg-stash-surface border-stash-border rounded-xl p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{selectedResource.title}</h1>
                  <div className="flex gap-2">
                    <span className="bg-stash-accent/20 text-stash-accent px-3 py-1 rounded-full text-sm">{selectedResource.category}</span>
                    <span className="bg-stash-elevated px-3 py-1 rounded-full text-sm">{selectedResource.format || 'Article'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
                <div><p className="text-stash-subtle mb-1">Category</p><p className="font-medium">{selectedResource.category}</p></div>
                <div><p className="text-stash-subtle mb-1">Read Time</p><p className="font-medium">{selectedResource.readTime || '5 min'}</p></div>
                <div><p className="text-stash-subtle mb-1">Format</p><p className="font-medium">{selectedResource.format || 'Article'}</p></div>
              </div>

              {selectedResource.tags.length > 0 && (
                <div className="mb-8">
                  <p className="text-stash-subtle text-sm mb-2">Tags</p>
                  <div className="flex gap-2">{selectedResource.tags.map(t => <span key={t} className="bg-stash-tag text-stash-tag-text px-3 py-1 rounded-full text-sm">#{t}</span>)}</div>
                </div>
              )}

              <div className="prose prose-invert max-w-none text-stash-text leading-relaxed mb-8 whitespace-pre-wrap">
                {selectedResource.text}
              </div>

              <div className="space-y-3">
                {selectedResource.url && <a href={selectedResource.url} target="_blank" rel="noreferrer" className="w-full bg-stash-accent text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-stash-accent-hover">{ICONS.external} Open Original</a>}
                <div className="flex gap-3">
                  <button onClick={() => setShowSavePopup(true)} className="flex-1 bg-stash-elevated border-stash-border py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-stash-border">{ICONS.edit} Edit</button>
                  <button onClick={() => deleteResource(selectedResource.id)} className="flex-1 border-red-500/30 text-red-400 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/10">{ICONS.trash} Delete Resource</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. CATEGORY MANAGEMENT - Figma Screen 4 */}
        {view === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Categories</h2>
              <button onClick={() => { const name = prompt('New category name'); if(name) addCategory(name) }} className="bg-stash-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-stash-accent-hover">+ New Category</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map(c => (
                <div key={c} className="bg-stash-surface border-stash-border rounded-xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{c}</h3>
                    {c !== 'Design' && <button onClick={() => deleteCategory(c)} className="text-red-400 text-sm">{ICONS.trash}</button>}
                  </div>
                  <p className="text-3xl font-bold mb-1">{resources.filter(r => r.category === c).length}</p>
                  <p className="text-stash-muted text-sm">Resources</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 5. SAVE RESOURCE POPUP - Figma Screen 5 */}
      {showSavePopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowSavePopup(false)}>
          <div className="bg-stash-surface border-stash-border rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-5">Add New Resource</h2>
            
            {/* Type Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {(['url', 'text', 'image'] as ResourceType[]).map(t => (
                <button key={t} onClick={() => setForm({...form, type: t})} className={`py-3 rounded-lg border transition-colors ${form.type === t? 'bg-stash-accent border-stash-accent text-white' : 'bg-stash-elevated border-stash-border hover:bg-stash-border'}`}>
                  {t === 'url'? '🔗 URL' : t === 'text'? '📝 Snippet' : '🖼️ Image'}
                </button>
              ))}
            </div>

            <form onSubmit={saveResource} className="space-y-4">
              <div><label className="text-sm text-stash-muted mb-1.5 block">Resource Title</label><input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5" /></div>
              
              {form.type === 'url' && <div><label className="text-sm text-stash-muted mb-1.5 block">Resource URL</label><input required placeholder="https://example.com" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5" /></div>}
              {form.type === 'text' && <div><label className="text-sm text-stash-muted mb-1.5 block">Text Content</label><textarea required placeholder="Paste your text snippet here..." value={form.text} onChange={e => setForm({...form, text: e.target.value})} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5 h-32" /></div>}
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-stash-muted mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5">{categories.map(c => <option key={c}>{c}</option>)}</select>
                </div>
                <div><label className="text-sm text-stash-muted mb-1.5 block">Tags</label><input placeholder="design, ui" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full bg-stash-elevated border-stash-border rounded-lg px-4 py-2.5" /></div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-stash-accent text-white py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover">Save Resource</button>
                <button type="button" onClick={() => setShowSavePopup(false)} className="px-6 bg-stash-elevated border-stash-border rounded-lg hover:bg-stash-border">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}