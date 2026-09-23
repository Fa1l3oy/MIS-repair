import { requireUser } from "@/lib/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireUser(["ADMIN"]);
  return children;
}
