declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'student' | 'parent' | 'teacher' | 'admin'
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: 'student' | 'parent' | 'teacher' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'student' | 'parent' | 'teacher' | 'admin'
  }
}