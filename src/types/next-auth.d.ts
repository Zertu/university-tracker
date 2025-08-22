import "next-auth";
declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'student' | 'parent' | 'teacher' | 'admin'
    } & DefaultSession["user"];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string
    role: 'student' | 'parent' | 'teacher' | 'admin'
  }
}