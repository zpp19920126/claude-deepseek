import { getSession } from "@/lib/auth";

export async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "ADMIN";
}
