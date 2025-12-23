import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import { logActivity, ACTIVITY_ACTIONS, ACTIVITY_MODULES } from "@/lib/activityLog";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            ventures: {
              select: { ventureId: true },
            },
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          return null;
        }

        await logActivity({
          userId: user.id,
          action: ACTIVITY_ACTIONS.LOGIN,
          module: ACTIVITY_MODULES.AUTH,
          entityType: 'Session',
          description: `User logged in: ${user.email}`,
          metadata: { email: user.email, role: user.role },
        });

        return {
          id: String(user.id),
          email: user.email,
          name: user.fullName,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          ventureIds: user.ventures.map((v: any) => v.ventureId),
        };
      },
    }),
    CredentialsProvider({
      id: "otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        console.log(`[AUTH] OTP authorize called with:`, { email: credentials?.email, code: credentials?.code ? '***' : 'missing' });
        
        if (!credentials?.email || !credentials?.code) {
          console.log(`[AUTH] Missing credentials`);
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();
        // Normalize code: convert to string, trim, remove all whitespace
        const normalizedCode = String(credentials.code).trim().replace(/\s+/g, '');

        // Verify OTP from database
        const validOtp = await prisma.emailOtp.findFirst({
          where: {
            email: normalizedEmail,
            code: normalizedCode,
            used: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!validOtp) {
          console.log(`[AUTH] OTP rejected for ${normalizedEmail}: no valid OTP found`);
          return null;
        }
        
        // Mark OTP as used
        await prisma.emailOtp.update({
          where: { id: validOtp.id },
          data: { used: true },
        });
        
        console.log(`[AUTH] OTP verified for ${normalizedEmail}, looking up user...`);

        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
              ventures: {
                select: { ventureId: true },
              },
            },
          });

          console.log(`[AUTH] User lookup result:`, user ? { id: user.id, email: user.email } : 'NOT FOUND');

          if (!user) {
            console.log(`[AUTH] User not found: ${normalizedEmail}`);
            return null;
          }

          try {
            await logActivity({
              userId: user.id,
              action: ACTIVITY_ACTIONS.LOGIN,
              module: ACTIVITY_MODULES.AUTH,
              entityType: 'Session',
              description: `User logged in: ${user.email}`,
              metadata: { email: user.email, role: user.role },
            });
          } catch (logErr) {
            console.log(`[AUTH] Activity log failed (non-fatal):`, logErr);
          }

          // Check for first daily login and award gamification points
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          
          const todayLogin = await prisma.gamificationEvent.findFirst({
            where: {
              userId: user.id,
              type: 'FIRST_DAILY_LOGIN',
              createdAt: { gte: today, lte: todayEnd },
            },
          });

          if (!todayLogin && user.ventures.length > 0) {
            // Award points for first login of the day (use first venture)
            const firstVentureId = user.ventures[0].ventureId;
            const { awardPointsForEvent } = await import('@/lib/gamification/awardPoints');
            await awardPointsForEvent(
              user.id,
              firstVentureId,
              'FIRST_DAILY_LOGIN',
              {
                metadata: { loginDate: today.toISOString().split('T')[0] },
                idempotencyKey: `first_login_${user.id}_${today.toISOString().split('T')[0]}`,
              }
            ).catch(err => {
              console.error('[gamification] First login award error:', {
                event: 'FIRST_DAILY_LOGIN',
                userId: user.id,
                ventureId: firstVentureId,
                key: `first_login_${user.id}_${today.toISOString().split('T')[0]}`,
                err: err instanceof Error ? err.message : String(err),
              });
            });
          }

          const result = {
            id: String(user.id),
            email: user.email,
            name: user.fullName,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            ventureIds: user.ventures.map((v: any) => v.ventureId),
          };
          
          console.log(`[AUTH] Returning user:`, { id: result.id, email: result.email });
          return result;
        } catch (err) {
          console.error(`[AUTH] Database error:`, err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.createdAt = (user as any).createdAt;
        token.ventureIds = (user as any).ventureIds;
      }
      // Ensure id is always set - fallback to sub (which NextAuth populates) if id is missing
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Use token.id, fallback to token.sub if id is missing
        const userId = token.id || token.sub;
        (session.user as any).id = userId;
        (session.user as any).role = token.role;
        (session.user as any).createdAt = token.createdAt;
        (session.user as any).ventureIds = token.ventureIds;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

export default NextAuth(authOptions);
