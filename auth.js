import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { ensureProfile } from '@/lib/ensure-profile'
import { getCredentials, getProfile } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

// Sessions are JWTs. The token proves identity; everything public about an
// account lives in the users table and is read fresh, so a renamed handle does
// not wait for the cookie to expire.
//
// Two ways in, one account. Both providers key on the email address, so signing
// in with Google to an address that registered a password lands on the same
// profile rather than making a second one.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize (creds) {
        const email = String(creds?.email || '').trim().toLowerCase()
        const password = String(creds?.password || '')
        if (!email || !password) return null

        const stored = await getCredentials(email)
        // Verify even when there is no account, so a wrong address and a wrong
        // password take the same time to fail and the form cannot be used to
        // find out who has registered.
        const ok = await verifyPassword(password, stored?.passwordHash ?? '')
        if (!ok) return null

        const profile = await getProfile(email)
        return { id: email, email, name: profile?.name || null, image: profile?.image || null }
      }
    })
  ],
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    async jwt ({ token, user, profile }) {
      if (profile) token.picture = profile.picture
      // The owner is identified by address until there is a users table to hold a role.
      token.role = token.email && token.email === process.env.ADMIN_EMAIL ? 'owner' : 'member'

      // A public identity is created once, on the way in, whichever door was
      // used. A failure here must not cost someone their session: the app shell
      // repairs a missing profile on the next page it renders.
      if ((profile || user) && token.email) {
        try {
          await ensureProfile({ email: token.email, name: token.name, image: token.picture })
        } catch (e) {
          console.error('profile bootstrap failed', e)
        }
      }
      return token
    },
    session ({ session, token }) {
      session.user.role = token.role || 'member'
      return session
    }
  },
  pages: { signIn: '/join', error: '/join' }
})
