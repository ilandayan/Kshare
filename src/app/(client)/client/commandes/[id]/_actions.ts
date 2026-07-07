"use server";

/**
 * Le retrait est désormais confirmé par le COMMERÇANT (scan du QR / code en
 * magasin) et non plus par le client. Cette action est conservée pour
 * compatibilité mais ne peut plus modifier la commande : côté base, la policy
 * RLS `orders_update_staff` interdit tout UPDATE depuis le compte client.
 *
 * Voir la Server Action `confirmerRetrait` dans (shop)/shop/scan/_actions.ts.
 */
export async function confirmPickup(): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: "Le retrait est confirmé par le commerçant lors de votre passage en magasin.",
  };
}
