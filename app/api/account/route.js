import { auth } from '@/auth'
import { deleteAccountData, deleteAccount, getProfile } from '@/lib/db'

// Deleting is not undoable, so it asks for the handle to be typed. A
// confirmation dialog is dismissed by reflex; typing your own name is not.
export async function DELETE (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }

  const scope = body?.scope === 'account' ? 'account' : 'data'
  const profile = await getProfile(session.user.email)
  const expected = profile?.handle || ''
  if (!expected || String(body?.confirm || '').trim().toLowerCase() !== expected.toLowerCase()) {
    return Response.json({ error: `Type ${expected || 'your handle'} to confirm.` }, { status: 400 })
  }

  const removed = scope === 'account'
    ? await deleteAccount(session.user.email)
    : await deleteAccountData(session.user.email)

  return Response.json({ ok: true, scope, removed })
}
