import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar/Sidebar";
import type { Board } from "@/types/app.types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", user.id)
    .order("order", { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar boards={(boards as Board[]) ?? []} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
