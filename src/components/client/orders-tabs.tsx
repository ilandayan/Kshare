"use client";

import { useState } from "react";
import { OrderCard } from "./order-card";
import { ClipboardList, Heart } from "lucide-react";

export interface OrderData {
  id: string;
  status: string;
  total_amount: number;
  quantity: number;
  qr_code_token: string | null;
  created_at: string;
  pickup_start: string | null;
  pickup_end: string | null;
  pickup_date: string | null;
  basket_type: string;
  commerce_name: string;
  commerce_city: string;
}

// ── Mock data for demo ──────────────────────────────────────────────
const MOCK_ACTIVE: OrderData[] = [
  {
    id: "demo-1",
    status: "paid",
    total_amount: 8.99,
    quantity: 1,
    qr_code_token: "KSH-4829",
    created_at: new Date().toISOString(),
    pickup_start: "17:00",
    pickup_end: "19:00",
    pickup_date: "today",
    basket_type: "bassari",
    commerce_name: "Boucherie Moche",
    commerce_city: "Paris 19e",
  },
  {
    id: "demo-2",
    status: "ready_for_pickup",
    total_amount: 12.5,
    quantity: 2,
    qr_code_token: "KSH-7153",
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    pickup_start: "14:00",
    pickup_end: "16:00",
    pickup_date: "today",
    basket_type: "halavi",
    commerce_name: "Fromagerie Gan Eden",
    commerce_city: "Paris 11e",
  },
  {
    id: "demo-3",
    status: "paid",
    total_amount: 15.0,
    quantity: 1,
    qr_code_token: "KSH-2041",
    created_at: new Date(Date.now() - 7200_000).toISOString(),
    pickup_start: "10:00",
    pickup_end: "12:00",
    pickup_date: "tomorrow",
    basket_type: "shabbat",
    commerce_name: "Traiteur Shalom",
    commerce_city: "Sarcelles",
  },
];

const MOCK_PAST: OrderData[] = [
  {
    id: "demo-4",
    status: "picked_up",
    total_amount: 9.99,
    quantity: 1,
    qr_code_token: null,
    created_at: new Date(Date.now() - 86400_000 * 2).toISOString(),
    pickup_start: "17:00",
    pickup_end: "19:00",
    pickup_date: null,
    basket_type: "bassari",
    commerce_name: "Boucherie Moche",
    commerce_city: "Paris 19e",
  },
  {
    id: "demo-5",
    status: "picked_up",
    total_amount: 6.5,
    quantity: 1,
    qr_code_token: null,
    created_at: new Date(Date.now() - 86400_000 * 5).toISOString(),
    pickup_start: "12:00",
    pickup_end: "14:00",
    pickup_date: null,
    basket_type: "parve",
    commerce_name: "Supermarche Hatov",
    commerce_city: "Creteil",
  },
  {
    id: "demo-6",
    status: "no_show",
    total_amount: 11.0,
    quantity: 2,
    qr_code_token: null,
    created_at: new Date(Date.now() - 86400_000 * 8).toISOString(),
    pickup_start: "16:00",
    pickup_end: "18:00",
    pickup_date: null,
    basket_type: "mix",
    commerce_name: "Epicerie Bereshit",
    commerce_city: "Paris 17e",
  },
  {
    id: "demo-7",
    status: "refunded",
    total_amount: 7.99,
    quantity: 1,
    qr_code_token: null,
    created_at: new Date(Date.now() - 86400_000 * 12).toISOString(),
    pickup_start: "11:00",
    pickup_end: "13:00",
    pickup_date: null,
    basket_type: "halavi",
    commerce_name: "Fromagerie Gan Eden",
    commerce_city: "Paris 11e",
  },
];

const MOCK_DONATIONS: OrderData[] = [
  {
    id: "demo-don-1",
    status: "picked_up",
    total_amount: 5.0,
    quantity: 1,
    qr_code_token: null,
    created_at: new Date(Date.now() - 86400_000 * 3).toISOString(),
    pickup_start: "15:00",
    pickup_end: "17:00",
    pickup_date: null,
    basket_type: "bassari",
    commerce_name: "Boucherie Moche",
    commerce_city: "Paris 19e",
  },
  {
    id: "demo-don-2",
    status: "paid",
    total_amount: 8.0,
    quantity: 1,
    qr_code_token: null,
    created_at: new Date(Date.now() - 86400_000).toISOString(),
    pickup_start: "12:00",
    pickup_end: "14:00",
    pickup_date: "today",
    basket_type: "parve",
    commerce_name: "Supermarche Hatov",
    commerce_city: "Creteil",
  },
];

// ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "active", label: "En cours" },
  { key: "past", label: "Passees" },
  { key: "donations", label: "Dons" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface OrdersTabsProps {
  activeOrders: OrderData[];
  pastOrders: OrderData[];
  donationOrders: OrderData[];
  useMock?: boolean;
}

export function OrdersTabs({ activeOrders, pastOrders, donationOrders, useMock }: OrdersTabsProps) {
  const [tab, setTab] = useState<TabKey>("active");

  // Use mock data if no real data and useMock is true
  const active = activeOrders.length > 0 ? activeOrders : useMock ? MOCK_ACTIVE : [];
  const past = pastOrders.length > 0 ? pastOrders : useMock ? MOCK_PAST : [];
  const donations = donationOrders.length > 0 ? donationOrders : useMock ? MOCK_DONATIONS : [];

  const counts: Record<TabKey, number> = {
    active: active.length,
    past: past.length,
    donations: donations.length,
  };

  const currentOrders = tab === "active" ? active : tab === "past" ? past : donations;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
              }`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Demo banner */}
      {useMock && (activeOrders.length === 0 && pastOrders.length === 0 && donationOrders.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 text-xs text-center">
          Donnees de demonstration — ces commandes sont fictives
        </div>
      )}

      {/* Orders list */}
      {currentOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e5f0]">
          {tab === "donations" ? (
            <>
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucun don pour le moment</p>
              <p className="text-sm text-gray-400 mt-1">
                Vos dons a des associations apparaitront ici
              </p>
            </>
          ) : (
            <>
              <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                {tab === "active" ? "Aucune commande en cours" : "Aucune commande passee"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {tab === "active"
                  ? "Commandez votre premier panier casher !"
                  : "Votre historique apparaitra ici"}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentOrders.map((order) => (
            <OrderCard key={order.id} order={order} isDonation={tab === "donations"} />
          ))}
        </div>
      )}
    </div>
  );
}
