import NextAuth, { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      type: string
      organizationId: string | null
      rolePermissions: string[]
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    type: string
    organizationId: string | null
    rolePermissions?: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    type: string
    organizationId: string | null
    rolePermissions: string[]
  }
}
