import { useMemo, useState } from 'react'
import type { Resource } from './stashData'

export default function Tags({ resources }: { resources: Resource[] }) {
  const [query, setQuery] = useState('')

  const tags = useMemo(() => {
    const countMap: Record<string, number> = {}
    resources.forEach(resource => {
      resource.tags.forEach(tag => {
        const normalized = tag.trim()
        if (!normalized) return
        countMap[normalized] = (countMap[normalized] || 0) + 1
      })
    })

    return Object.entries(countMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .filter(item => item.tag.toLowerCase().includes(query.toLowerCase()))
  }, [resources, query])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-sm text-gray-400 mt-0.5">Browse all tags used across your library.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
            <span className="text-gray-400">#</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tags..."
              className="bg-transparent outline-none w-40 text-sm text-gray-700 placeholder:text-gray-400"
            />
          </div>
          <div className="text-xs text-gray-500">{tags.length} tags</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
        {tags.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No tags found. Add tags to resources to see them here.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tags.map(({ tag, count }) => (
              <div key={tag} className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{tag}</p>
                  <p className="text-xs text-gray-400 mt-1">Used in {count} resource{count === 1 ? '' : 's'}</p>
                </div>
                <div className="text-xs font-semibold text-brand">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
