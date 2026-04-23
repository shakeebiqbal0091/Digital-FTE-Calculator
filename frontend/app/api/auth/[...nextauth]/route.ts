import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const res = await axios.post('http://localhost:4000/api/auth/login', {
            email:    credentials?.email,
            password: credentials?.password,
          })
          const { token, user, organization } = res.data
          if (token && user) {
            return { ...user, accessToken: token, organization }
          }
          return null
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.myAccessToken  = (user as any).accessToken
        token.organization   = (user as any).organization
      }
      return token
    },
    async session({ session, token }) {
      (session as any).accessToken  = token.myAccessToken
      (session as any).organization = token.organization
      return session
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt' },
})

export { handler as GET, handler as POST }