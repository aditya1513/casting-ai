import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import type { NextAuthConfig } from "next-auth"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password
          })

          if (response.data.success && response.data.data) {
            const { user, accessToken } = response.data.data
            return {
              id: user.id,
              email: user.email,
              name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email,
              role: user.role,
              accessToken
            }
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.accessToken = user.accessToken
      }
      
      // Handle OAuth provider login
      if (account?.provider && (account.provider === "google" || account.provider === "github")) {
        try {
          // Call backend to create/update user via OAuth
          const response = await axios.post(`${API_URL}/auth/oauth`, {
            provider: account.provider,
            providerId: account.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
            accessToken: account.access_token,
          })
          
          if (response.data.success && response.data.data) {
            const { user: backendUser, accessToken } = response.data.data
            token.id = backendUser.id
            token.role = backendUser.role
            token.accessToken = accessToken
          }
        } catch (error) {
          console.error("OAuth backend sync error:", error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.accessToken = token.accessToken as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    newUser: "/auth/register"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
  debug: process.env.NODE_ENV === "development",
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)