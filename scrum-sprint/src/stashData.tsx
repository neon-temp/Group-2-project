import { useEffect, useState, useMemo } from 'react'
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
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'

// ── Canonical types (matches Firestore schema) ─────────────────────────────
export type Resource = {
  id: string
  title: string
  type: 'url' | 'text'
  url: string
  text: string
  category: string
  tags: string[]
  savedAt: string
}

export type ResourceForm = {
  title: string
  type: 'url' | 'text'
  url: string
  text: string
  category: string
  tags: string[]
}

export type Stats = {
  total: number
  recentlyAdded: number
  uncategorized: number
}

const DEFAULT_CATEGORIES = ['General', 'Work', 'Learning', 'Tools', 'Inspiration']

// ── Hook ───────────────────────────────────────────────────────────────────
export function useStashData() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [resourcesLoading, setResourcesLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now())

    updateCurrentTime()
    const intervalId = window.setInterval(updateCurrentTime, 60000)

    return () => window.clearInterval(intervalId)
  }, [])

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) {
        setResources([])
        setResourcesLoading(false)
        return
      }

      setResourcesLoading(true)
    })
  }, [])

  // Resources + categories (real-time)
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, `users/${user.uid}/resources`),
      orderBy('savedAt', 'desc'),
    )
    const unsubResources = onSnapshot(q, (snap) => {
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource)))
      setResourcesLoading(false)
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

  // ── Helpers ──────────────────────────────────────────────────────────────
  const saveCategories = async (names: string[]) => {
    if (!user) return
    await setDoc(doc(db, `users/${user.uid}/settings/categories`), { names })
  }

  // ── Resource actions ─────────────────────────────────────────────────────
  const addResource = async (form: ResourceForm) => {
    if (!user) return
    await addDoc(collection(db, `users/${user.uid}/resources`), {
      ...form,
      savedAt: new Date().toISOString(),
    })
  }

  const updateResource = async (id: string, form: ResourceForm) => {
    if (!user) return
    const original = resources.find((r) => r.id === id)
    await updateDoc(doc(db, `users/${user.uid}/resources`, id), {
      ...form,
      savedAt: original?.savedAt ?? new Date().toISOString(),
    })
  }

  const deleteResource = async (id: string) => {
    if (!user) return
    setResources((prev) => prev.filter((r) => r.id !== id))
    await deleteDoc(doc(db, `users/${user.uid}/resources`, id))
  }

  // ── Category actions ─────────────────────────────────────────────────────
  const addCategory = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || categories.includes(trimmed)) return
    await saveCategories([...categories, trimmed])
  }

  const renameCategory = async (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed || categories.includes(trimmed) || !user) return
    await saveCategories(categories.map((c) => (c === oldName ? trimmed : c)))
    await Promise.all(
      resources
        .filter((r) => r.category === oldName)
        .map((r) =>
          updateDoc(doc(db, `users/${user.uid}/resources`, r.id), { category: trimmed }),
        ),
    )
  }

  const deleteCategory = async (name: string) => {
    if (name === 'General' || !user) return
    await Promise.all(
      resources
        .filter((r) => r.category === name)
        .map((r) =>
          updateDoc(doc(db, `users/${user.uid}/resources`, r.id), { category: 'General' }),
        ),
    )
    await saveCategories(categories.filter((c) => c !== name))
  }

  // ── Computed stats ───────────────────────────────────────────────────────
  const stats: Stats = useMemo(() => {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const now = currentTime
    return {
      total: resources.length,
      recentlyAdded: resources.filter((r) => now - new Date(r.savedAt).getTime() < weekMs).length,
      uncategorized: resources.filter((r) => r.category === 'General').length,
    }
  }, [currentTime, resources])

  return {
    // Auth
    user,
    authLoading,
    logout: () => signOut(auth),
    // Data
    resources,
    resourcesLoading,
    categories,
    stats,
    // Actions
    addResource,
    updateResource,
    deleteResource,
    addCategory,
    renameCategory,
    deleteCategory,
  }
}
  