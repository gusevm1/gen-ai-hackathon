'use client'

import { useState, useEffect, useCallback } from 'react'

interface AlphaUser {
  id: string
  email: string
  approved: boolean
  created_at: string
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [users, setUsers] = useState<AlphaUser[]>([])
  const [loading, setLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${password}`,
  }), [password])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin', { headers: headers() })
    if (!res.ok) {
      setAuthenticated(false)
      setError('Invalid password')
      setLoading(false)
      return
    }
    const data = await res.json()
    setUsers(data)
    setAuthenticated(true)
    setError('')
    setLoading(false)
  }, [headers])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await fetchUsers()
  }

  async function toggleApproval(email: string, currentApproved: boolean) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, approved: !currentApproved }),
    })
    await fetchUsers()
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    await fetch('/api/admin', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: newEmail.trim(), approved: true }),
    })
    setNewEmail('')
    await fetchUsers()
  }

  async function removeUser(email: string) {
    if (!confirm(`Remove ${email} from alpha?`)) return
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ email }),
    })
    await fetchUsers()
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-white text-center">Admin Panel</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            autoFocus
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  const approved = users.filter(u => u.approved)
  const waitlist = users.filter(u => !u.approved)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Alpha Users</h1>
          <span className="text-sm text-gray-400">
            {approved.length} approved · {waitlist.length} waitlisted
          </span>
        </div>

        {/* Add user */}
        <form onSubmit={addUser} className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Add email as approved"
            className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500"
          >
            Add
          </button>
        </form>

        {/* Approved */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-green-400">Approved ({approved.length})</h2>
          <div className="space-y-2">
            {approved.map(u => (
              <UserRow key={u.id} user={u} onToggle={toggleApproval} onRemove={removeUser} />
            ))}
          </div>
        </div>

        {/* Waitlist */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-yellow-400">Waitlist ({waitlist.length})</h2>
          {waitlist.length === 0 ? (
            <p className="text-gray-500 text-sm">No one on the waitlist yet.</p>
          ) : (
            <div className="space-y-2">
              {waitlist.map(u => (
                <UserRow key={u.id} user={u} onToggle={toggleApproval} onRemove={removeUser} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserRow({
  user,
  onToggle,
  onRemove,
}: {
  user: AlphaUser
  onToggle: (email: string, approved: boolean) => void
  onRemove: (email: string) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-900 border border-gray-800">
      <div>
        <p className="text-sm font-medium">{user.email}</p>
        <p className="text-xs text-gray-500">
          {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(user.email, user.approved)}
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            user.approved
              ? 'bg-green-900/50 text-green-400 hover:bg-red-900/50 hover:text-red-400'
              : 'bg-yellow-900/50 text-yellow-400 hover:bg-green-900/50 hover:text-green-400'
          }`}
        >
          {user.approved ? 'Revoke' : 'Approve'}
        </button>
        <button
          onClick={() => onRemove(user.email)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-red-400"
        >
          ×
        </button>
      </div>
    </div>
  )
}
