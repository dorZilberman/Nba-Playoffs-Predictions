import NextAuth, { DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"
import dbConnect from "./db"
import User from "./models/User"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      isAdmin: boolean
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false
      }

      await dbConnect()

      // Check if user exists, if not create them
      let dbUser = await User.findOne({ email: user.email })

      if (!dbUser) {
        // Check if this is the admin user
        const isAdmin = user.email === process.env.ADMIN_EMAIL

        dbUser = await User.create({
          email: user.email,
          name: user.name || "User",
          image: user.image || undefined,
          isAdmin,
        })
      }

      return true
    },
    async session({ session, token }) {
      if (session.user?.email) {
        await dbConnect()
        const dbUser = await User.findOne({ email: session.user.email })

        if (dbUser) {
          session.user.id = dbUser._id.toString()
          session.user.isAdmin = dbUser.isAdmin
        }
      }

      return session
    },
  },
  pages: {
    signIn: "/signin",
  },
})
