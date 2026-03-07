import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BasketEditForm from "./_form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBasketPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: commerce } = await supabase
    .from("commerces")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!commerce) redirect("/inscription-commercant");

  const { data: basket } = await supabase
    .from("baskets")
    .select("*")
    .eq("id", id)
    .eq("commerce_id", commerce.id)
    .single();

  if (!basket) notFound();

  return <BasketEditForm basket={basket} />;
}
