import { useState, useMemo } from 'react'
import { useStashData } from './stashData'
import type { Resource, ResourceForm } from './stashData'
import ResourceDetail from './resourceDetail'
import Categories from './categories'
import Tags from './tags'
import AddResourceModal from './addResource'
import AuthScreen from './authScreen'
import folderEmpty from './assets/folder-empty.png'
import iconLibrary from './assets/icon-library.png'
import iconCategories from './assets/icon-categories.png'
import iconTags from './assets/icon-tags.png'

// ── Types ──────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'links' | 'snippets'
type NavItem = 'library' | 'categories' | 'tags' | 'settings'

// ── Helpers ────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  general:     'bg-gray-100 text-gray-600',
  work:        'bg-blue-100 text-blue-700',
  learning:    'bg-purple-100 text-purple-700',
  tools:       'bg-teal-100 text-teal-700',
  inspiration: 'bg-orange-100 text-orange-700',
  design:      'bg-blue-100 text-blue-700',
  development: 'bg-teal-100 text-teal-700',
  research:    'bg-purple-100 text-purple-700',
  personal:    'bg-red-100 text-red-600',
  productivity:'bg-green-100 text-green-700',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

function getSource(resource: Resource): string {
  if (resource.type === 'url' && resource.url) {
    try { return new URL(resource.url).hostname.replace('www.', '') }
    catch { return resource.url }
  }
  return 'Text snippet'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

// ── Logo ───────────────────────────────────────────────────────────────────
function StashLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#3525CD" />
      <rect x="12" y="20" width="40" height="9" rx="4.5" fill="#EDE9FE" />
      <rect x="12" y="35" width="26" height="9" rx="4.5" fill="#EDE9FE" />
    </svg>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  )
}
function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function IconLink() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}
function IconFile() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}
function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconCloud() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  )
}
function IconLightning() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
}
function IconPlusCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor = 'text-gray-500', accent }: {
  label: string; value: string; sub: string; subColor?: string; accent: string
}) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className={`text-xs font-medium ${accent}`}>{sub}</span>
      </div>
      {subColor !== 'text-gray-500' && <div className={`text-xs mt-0.5 ${subColor}`} />}
    </div>
  )
}

// ── Resource card ──────────────────────────────────────────────────────────
function ResourceCard({ resource, onClick, gridView }: { resource: Resource; onClick: () => void; gridView: boolean }) {
  const categoryColor = getCategoryColor(resource.category)
  const source = getSource(resource)

  return (
    <div
      className={`flex items-start justify-between py-5 border-b border-gray-100 last:border-0 group cursor-pointer hover:bg-gray-50 -mx-5 px-5 rounded-xl transition-colors ${gridView ? 'bg-white' : ''}`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-gray-900 group-hover:text-brand transition-colors">
            {resource.title}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColor}`}>
            {resource.category}
          </span>
        </div>
        {resource.text && (
          <p className="text-sm text-gray-500 leading-relaxed mb-2 line-clamp-2">{resource.text}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            {resource.type === 'text' ? <IconFile /> : <IconLink />}
            {source}
          </span>
          {resource.tags.map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{tag}</span>
          ))}
        </div>
      </div>
      <button
        className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <IconEdit />
      </button>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-px">
      {[1, 2, 3].map(i => (
        <div key={i} className="py-5 border-b border-gray-100 animate-pulse">
          <div className="flex gap-2 mb-2">
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-16" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-full mb-1" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    user, authLoading, logout,
    resources, resourcesLoading, categories, stats,
    addResource, updateResource, deleteResource,
    addCategory, renameCategory, deleteCategory,
  } = useStashData()

  const [activeNav, setActiveNav] = useState<NavItem>('library')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [isGridView, setIsGridView] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)

  // Must be declared before any early returns to satisfy Rules of Hooks
  const statCards = useMemo(() => {
    const prevTotal = Math.max(stats.total - stats.recentlyAdded, 0)
    const pctChange = prevTotal > 0 ? Math.round((stats.recentlyAdded / prevTotal) * 100) : 0
    return { pctChange }
  }, [stats.total, stats.recentlyAdded])

  const STORAGE_LIMIT_GB = 100
  const usedStorageMB = resources.length
  const storageUsedPercent = Math.min(100, Math.round((usedStorageMB / (STORAGE_LIMIT_GB * 1024)) * 100))
  const storageRemainingGB = Math.max(0, Number((STORAGE_LIMIT_GB - usedStorageMB / 1024).toFixed(3)))

  // Auth / loading gates
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <StashLogo size={48} />
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    )
  }
  if (!user) return <AuthScreen />

  // Filtered resources
  const filtered = resources.filter(r => {
    if (activeFilter === 'links' && r.type !== 'url') return false
    if (activeFilter === 'snippets' && r.type !== 'text') return false
    if (search) {
      const q = search.toLowerCase()
      const match = r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })

  // Handlers
  const openAddModal = () => { setEditingResource(null); setShowAddModal(true) }
  const openEditModal = (r: Resource) => { setEditingResource(r); setShowAddModal(true); setSelectedResource(null) }
  const handleSave = async (form: ResourceForm) => {
    if (editingResource) {
      await updateResource(editingResource.id, form)
    } else {
      await addResource(form)
    }
    setShowAddModal(false)
  }
  const handleDelete = async (id: string) => {
    await deleteResource(id)
    setSelectedResource(null)
  }

  // CSS filter helpers for nav icons
  const activeTint = 'brightness(0) saturate(100%) invert(18%) sepia(89%) saturate(3000%) hue-rotate(237deg) brightness(85%) contrast(110%)'
  const dimFilter  = 'brightness(0) saturate(0%) opacity(45%)'

  const navItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
    {
      id: 'library', label: 'Library',
      icon: <img src={iconLibrary} alt="Library" width={20} height={20}
              style={{ objectFit: 'contain', filter: activeNav === 'library' ? 'none' : dimFilter }} />,
    },
    {
      id: 'categories', label: 'Categories',
      icon: <img src={iconCategories} alt="Categories" width={20} height={20}
              style={{ objectFit: 'contain', filter: activeNav === 'categories' ? activeTint : dimFilter }} />,
    },
    {
      id: 'tags', label: 'Tags',
      icon: <img src={iconTags} alt="Tags" width={20} height={20}
              style={{ objectFit: 'contain', filter: dimFilter }} />,
    },
    { id: 'settings', label: 'Settings', icon: <IconSettings /> },
  ]

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Modal */}
      {showAddModal && (
        <AddResourceModal
          categories={categories}
          editingResource={editingResource}
          onSave={handleSave}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className="w-56 flex flex-col bg-white border-r border-gray-200 shrink-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
          <StashLogo size={32} />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Stash</p>
            <p className="text-[10px] text-gray-400">Personal Knowledge</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id)
                setSelectedResource(null)
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeNav === item.id
                  ? 'bg-brand-light text-brand font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Storage used</span>
              <span>{usedStorageMB} MB / {STORAGE_LIMIT_GB} GB</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${storageUsedPercent > 90 ? 'bg-red-500' : storageUsedPercent > 70 ? 'bg-yellow-500' : 'bg-brand'}`}
                style={{ width: `${storageUsedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">{storageRemainingGB} GB remaining</p>
          </div>
          <button
            onClick={openAddModal}
            className="w-full flex items-center justify-center gap-2 bg-stash-accent text-white py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover mb-4"
          >
            <IconPlus />
            Add Resource
          </button>
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
              <IconCloud />
              <span>{user.email}</span>
            </div>
            <button
              onClick={logout}
              className="text-xs text-blue-600 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Categories view */}
        {activeNav === 'categories' && (
          <Categories
            categories={categories}
            resources={resources}
            onAddCategory={addCategory}
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
          />
        )}

        {/* Tags view */}
        {activeNav === 'tags' && (
          <Tags resources={resources} />
        )}

        {/* Resource detail */}
        {activeNav === 'library' && selectedResource && (
          <ResourceDetail
            resource={selectedResource}
            onBack={() => setSelectedResource(null)}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        )}

        {/* Settings view */}
        {activeNav === 'settings' && (
          <div className="flex-1 flex items-center justify-center px-6 py-8 bg-gray-50">
            <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Settings</h1>
              <p className="text-sm text-gray-500">Settings are coming soon. Manage your account and workspace preferences here.</p>
            </div>
          </div>
        )}

        {/* Library list */}
        {activeNav === 'library' && !selectedResource && (
          <>
            <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-light transition-all">
                <IconSearch />
                <input
                  className="bg-transparent outline-none flex-1 text-gray-700 placeholder:text-gray-400 text-sm"
                  placeholder="Search across your library..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="text-gray-400 hover:text-gray-700 transition-colors p-1">
                <IconBell />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Stat cards */}
              <div className="flex gap-4">
                <StatCard
                  label="Total Resources"
                  value={String(stats.total)}
                  sub={statCards.pctChange > 0 ? `+${statCards.pctChange}%` : ''}
                  accent="text-green-600"
                  subColor="text-green-600"
                />
                <StatCard
                  label="Recently Added"
                  value={String(stats.recentlyAdded)}
                  sub="This week"
                  accent="text-brand"
                />
                <StatCard
                  label="Uncategorized"
                  value={String(stats.uncategorized)}
                  sub={stats.uncategorized > 0 ? 'Needs attention' : 'All organised'}
                  accent={stats.uncategorized > 0 ? 'text-red-500' : 'text-green-600'}
                  subColor={stats.uncategorized > 0 ? 'text-red-500' : 'text-gray-500'}
                />
                <StatCard
                  label="Categories"
                  value={String(categories.length)}
                  sub="Active"
                  accent="text-gray-500"
                />
              </div>

              {/* Filter + view controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  {(['all', 'links', 'snippets'] as FilterTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeFilter === tab
                          ? 'bg-brand text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-white hover:bg-blue-600'
                      }`}
                    >
                      {tab === 'all' ? 'All Resources' : tab === 'links' ? 'Links' : 'Snippets'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 border border-gray-200 bg-white rounded-lg px-3 py-1.5">
                    Sort by: Date
                  </span>
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setIsGridView(false)}
                      className={`p-1.5 ${!isGridView ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                    >
                      <IconList />
                    </button>
                    <button
                      onClick={() => setIsGridView(true)}
                      className={`p-1.5 ${isGridView ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                    >
                      <IconGrid />
                    </button>
                  </div>
                </div>
              </div>

              {/* Resource list */}
              <div className="bg-white rounded-xl border border-gray-200 px-5">
                {resourcesLoading ? (
                  <Skeleton />
                ) : filtered.length > 0 ? (
                  <div className={isGridView ? 'grid gap-4 sm:grid-cols-2' : 'space-y-0'}>
                    {filtered.map(r => (
                      <ResourceCard key={r.id} resource={r} onClick={() => setSelectedResource(r)} gridView={isGridView} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <img src={folderEmpty} alt="Empty library" width={56} height={56} style={{ objectFit: 'contain' }} className="mb-5" />
                    <h3 className="text-base font-semibold text-gray-800 mb-1.5">
                      {search || activeFilter !== 'all' ? 'No resources found' : 'Your library is empty'}
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
                      {search || activeFilter !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : "You haven't saved any resources yet. Add your first link, snippet, or document to get started."}
                    </p>
                    {!search && activeFilter === 'all' && (
                      <button
                        onClick={openAddModal}
                        className="w-fit px-6 mx-auto flex items-center justify-center gap-2 bg-stash-accent text-white py-2.5 rounded-lg font-medium hover:bg-stash-accent-hover mb-4"
                      >
                        +Add Resource
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Drop zone */}
              <div
                onClick={openAddModal}
                className="relative border-2 border-dashed border-gray-200 rounded-xl py-6 flex items-center justify-center text-sm text-gray-400 bg-white hover:border-brand-light hover:text-brand transition-colors cursor-pointer"
              >
                <IconPlusCircle />
                <span className="ml-2">Drop files or paste a link to add a resource</span>
                <button
                  onClick={e => { e.stopPropagation(); openAddModal() }}
                  className="absolute right-4 bottom-4 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors"
                >
                  <IconLightning />
                </button>
              </div>

              {/* Footer: last saved date of newest resource */}
              {resources.length > 0 && (
                <p className="text-xs text-center text-blue-300 pb-2">
                  Last saved · {formatDate(resources[0].savedAt)}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
