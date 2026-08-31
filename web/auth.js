import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Sessions are JWTs for now. There is no database yet, so nothing is persisted
// beyond the cookie: signing in proves identity and nothing more. When Postgres
// lands, an adapter goes here and the session strategy can move to "database".
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    jwt ({ token, profile }) {
      if (profile) token.picture = profile.picture
      // The owner is identified by address until there is a users table to hold a role.
      token.role = token.email && token.email === process.env.ADMIN_EMAIL ? 'owner' : 'member'
      return token
    },
    session ({ session, token }) {
      session.user.role = token.role || 'member'
      return session
    }
  },
  pages: { error: '/' }
})
