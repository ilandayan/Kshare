export type UserRole = "client" | "commerce" | "association" | "admin";
export type CommerceStatus = "pending" | "validated" | "refused" | "complement_required";
export type AssociationStatus = "pending" | "validated" | "refused" | "complement_required";
export type BasketType = "bassari" | "halavi" | "parve" | "shabbat" | "mix";
export type BasketDay = "today" | "tomorrow";
export type BasketStatus = "draft" | "published" | "sold_out" | "expired" | "disabled";
export type OrderStatus = "created" | "paid" | "ready_for_pickup" | "picked_up" | "no_show" | "refunded" | "cancelled_admin";
export type DonationStatus = "available" | "reserved_for_association" | "collected" | "cancelled_admin";
export type SubscriptionStatus = "active" | "offered" | "unpaid" | "cancellation_requested";
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface BasketTypeConfig {
  value: BasketType;
  label: string;
  emoji: string;
  description: string;
}

export interface TicketMessage {
  sender: "client" | "admin";
  content: string;
  created_at: string;
}
