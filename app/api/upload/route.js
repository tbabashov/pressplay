import { auth } from '@/auth'
import { uploadCover, storageReady } from '@/lib/storage'

export const runtime = 'nodejs'

const MAX = 5 * 1024 * 1024
const OK = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  let form
  try { form = await req.formData() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }

  const file = form.get('file')
  const hint = String(form.get('hint') || 'cover')
  if (!file || typeof file === 'string') return Response.json({ error: 'No file.' }, { status: 400 })
  if (!OK.has(file.type)) return Response.json({ error: 'Images only: jpeg, png, webp or gif.' }, { status: 400 })
  if (file.size > MAX) return Response.json({ error: 'That image is over 5MB.' }, { status: 400 })

  // Without a service key there is nowhere to put it, and saying so beats
  // failing silently or quietly inlining megabytes into the database.
  if (!storageReady()) {
    return Response.json({
      error: 'Uploads are not configured yet. Paste an image URL instead, or add SUPABASE_SERVICE_ROLE_KEY.',
      needsSetup: true
    }, { status: 503 })
  }

  try {
    const url = await uploadCover(Buffer.from(await file.arrayBuffer()), file.type, hint)
    return Response.json({ url })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 })
  }
}
