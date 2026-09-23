import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { clearFailures, lockedMinutes, recordFailure } from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const wait = lockedMinutes(email);
        if (wait > 0) {
          throw new Error(`กรอกรหัสผ่านผิดหลายครั้ง กรุณาลองใหม่ในอีก ${wait} นาที`);
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          recordFailure(email);
          throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }
        clearFailures(email);
        if (!user.isActive) {
          throw new Error("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = true;
        return token;
      }
      // Re-read role/status on every session check so that changes made by an
      // admin (role change, deactivation) take effect without re-login.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true, role: true, isActive: true },
        });
        token.active = !!dbUser?.isActive;
        if (dbUser) {
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.active = token.active;
      session.user.name = token.name;
      return session;
    },
  },
};
