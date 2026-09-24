import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { CommandPalette } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { NotificationCountProvider } from "./notification-count";
import { Sidebar, type ShellUser } from "./sidebar";

export async function AppShell({ user, children }: { user: Session["user"]; children: React.ReactNode }) {
  const unread = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
  const shellUser: ShellUser = { name: user.name ?? "", email: user.email ?? "", role: user.role };

  return (
    <NotificationCountProvider initialCount={unread}>
      <Sidebar user={shellUser} />
      <CommandPalette role={user.role} />
      <div className="min-h-screen lg:pl-64 print:pl-0">
        <MobileNav user={shellUser} />
        {/* Bottom padding keeps content clear of the mobile tab bar. */}
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-14 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </NotificationCountProvider>
  );
}
