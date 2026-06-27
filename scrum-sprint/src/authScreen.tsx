import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'

function StashLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#3525CD" />
      <rect x="12" y="20" width="40" height="9" rx="4.5" fill="#EDE9FE" />
      <rect x="12" y="35" width="26" height="9" rx="4.5" fill="#EDE9FE" />
    </svg>
  )
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm p-8">
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <StashLogo size={48} />
          <h1 className="text-xl font-bold text-gray-900 mt-4">Stash</h1>
          <p className="text-sm text-gray-400 mt-1">Your personal resource library</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light transition-all"
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stash-accent text-white py-2.5 rounded-lg font-medium 
 hover:bg-stash-accent-hover"
          >
            {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError('') }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
