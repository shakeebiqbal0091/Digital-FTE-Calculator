import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const res = await axios.post(
            `${process.env.BACKEND_URL}/api/auth/login`,
            { email: credentials?.email, password: credentials?.password }
          )
          if (res.data?.token) {
            return { ...res.data, email: credentials?.email }
          }
          return null
        } catch {
          return null
        }
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 15 * 60 },  // matches backend token
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.accessToken = (user as any).token
      return token
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/login'   // your custom login page
  },
  secret: process.env.NEXTAUTH_SECRET
})

export { handler as GET, handler as POST }