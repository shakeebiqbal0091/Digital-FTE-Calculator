import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import axios from 'axios'

type AuthUser = User & {
  accessToken?: string
  organization?: unknown
}

type AppToken = JWT & {
  myAccessToken?: string
  organization?: unknown
}

type AppSession = Session & {
  accessToken?: string
  organization?: unknown
}

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
      const appToken = token as AppToken
      if (user) {
        const authUser = user as AuthUser
        appToken.myAccessToken = authUser.accessToken
        appToken.organization = authUser.organization
      }
      return appToken
    },
    async session({ session, token }) {
      const appSession = session as AppSession
      const appToken = token as AppToken
      appSession.accessToken = appToken.myAccessToken
      appSession.organization = appToken.organization
      return appSession
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt' },
})

export { handler as GET, handler as POST }