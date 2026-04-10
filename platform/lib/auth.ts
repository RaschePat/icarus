import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { apiLogin } from "./api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await apiLogin(
            credentials.email as string,
            credentials.password as string,
          );
          return {
            id:           res.user_id,
            name:         res.name,
            email:        credentials.email as string,
            role:         res.role,
            access_token: res.access_token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role         = (user as { role?: string }).role;
        token.user_id      = user.id;
        token.access_token = (user as { access_token?: string }).access_token;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role         = token.role as string;
      session.user.user_id      = token.user_id as string;
      session.user.access_token = token.access_token as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
