import type { Resource } from './stashData'

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

function getSource(resource: Resource): string {
  if (resource.type === 'url' && resource.url) {
    try { return new URL(resource.url).hostname.replace('www.', '') }
    catch { return resource.url }
  }
  return 'Text snippet'
}

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

// ── Icons ──────────────────────────────────────────────────────────────────
function IconBack() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
}
function IconEdit() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function IconTrash() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
}
function IconLink() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
}
function IconExternalLink() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
}
function IconBell() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
}

// ── Detail row ─────────────────────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-sm font-medium text-gray-900">{children}</div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  resource: Resource
  onBack: () => void
  onEdit: (resource: Resource) => void
  onDelete: (id: string) => Promise<void>
}

export default function ResourceDetail({ resource, onBack, onEdit, onDelete }: Props) {
  const categoryColor = getCategoryColor(resource.category)
  const source = getSource(resource)
  const formatLabel = resource.type === 'text' ? 'Snippet' : 'URL'

  async function handleDelete() {
    if (!confirm(`Delete "${resource.title}"?`)) return
    await onDelete(resource.id)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <IconBack />
          </button>
          <span className="text-gray-300">|</span>
          <nav className="flex items-center gap-1.5">
            <button onClick={onBack} className="hover:text-brand transition-colors">Library</button>
            <span className="text-gray-300">›</span>
            <span>{resource.category}</span>
            <span className="text-gray-300">›</span>
            <span className="text-gray-800 font-medium truncate max-w-45">
              {resource.title.length > 20 ? resource.title.slice(0, 20) + '…' : resource.title}
            </span>
          </nav>
        </div>
        <div className="ml-auto">
          <button className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <IconBell />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-gray-50">
        {/* Meta + title */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-brand uppercase mb-3">
            <span className="w-2 h-2 rounded-sm bg-brand inline-block" />
            Saved on {formatDate(resource.savedAt)}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{resource.title}</h1>
          {resource.type === 'url' && resource.url ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors"
            >
              <IconLink />
              {source}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
              <IconLink />
              {source}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(resource)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <IconEdit />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <IconTrash />
            Delete
          </button>
        </div>

        {/* Detail card */}
        <div className="bg-white rounded-xl border border-gray-200 px-6">
          <DetailRow label="Title">{resource.title}</DetailRow>
          <DetailRow label="Category">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColor}`}>
              {resource.category}
            </span>
          </DetailRow>
          <DetailRow label="Format"><span className="font-bold">{formatLabel}</span></DetailRow>
          <DetailRow label="Saved">{formatDate(resource.savedAt)}</DetailRow>

          <div className="py-4 border-b border-gray-100">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Tags</p>
            {resource.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {resource.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-sm text-gray-600 border border-gray-200 px-3 py-1 rounded-full hover:border-brand hover:text-brand cursor-pointer transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No tags</p>
            )}
          </div>

          <div className="py-4">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Actions</p>
            {resource.type === 'url' && resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-brand hover:bg-brand-hover text-white font-medium py-3 rounded-xl transition-colors"
              >
                <IconExternalLink />
                Open Original
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-400 font-medium py-3 rounded-xl">
                Text snippet — no URL
              </div>
            )}
          </div>
        </div>

        {/* Text / description */}
        {resource.text && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
              {resource.type === 'text' ? 'Snippet' : 'Notes'}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{resource.text}</p>
          </div>
        )}
      </div>
    </div>
  )
}
