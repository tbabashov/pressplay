import { auth } from '@/auth'
import { deleteDiscographyEntry } from '@/lib/db'
import { param } from '@/lib/route-param'

export async function DELETE (_req, { params }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const id = param((await params).id)
  await deleteDiscographyEntry(session.user.email, id)
  return Response.json({ ok: true })
}
