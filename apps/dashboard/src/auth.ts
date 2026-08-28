import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authenticateLocalUser } from "@yinne/organizations/identity";
import { env } from "@yinne/config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(1024),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: env().AUTH_TRUST_HOST,
  secret: env().AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 15 * 60 },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        return authenticateLocalUser(parsed.data.email, parsed.data.password);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-yinne.session-token"
          : "yinne.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
