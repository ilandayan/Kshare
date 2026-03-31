"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, ArrowDownRight, Calendar } from "lucide-react";

interface FinanceSummary {
  totalSales: number;
  totalCommissions: number;
  totalServiceFees: number;
  totalRefunds: number;
  totalPayouts: number;
  netBalance: number;
}

interface FinanceDashboardProps {
  balance: number;
  summary: FinanceSummary;
  nextPayoutDate: string;
  plan: string;
  commissionRate: number;
  period: string;
}

const PERIODS = [
  { value: "today",    label: "Aujourd'hui" },
  { value: "week",     label: "Cette semaine" },
  { value: "month",    label: "Ce mois" },
  { value: "3months",  label: "3 derniers mois" },
  { value: "6months",  label: "6 derniers mois" },
  { value: "12months", label: "12 derniers mois" },
  { value: "year",     label: "Cette année" },
  { value: "total",    label: "Total" },
];

function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function FinanceDashboard({
  balance,
  summary,
  nextPayoutDate,
  plan,
  commissionRate,
  period,
}: FinanceDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <Badge variant={plan === "pro" ? "default" : "secondary"} className="text-sm">
          Plan {plan === "pro" ? "Pro" : "Starter"} — {commissionRate}% commission
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Solde actuel
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatEUR(balance)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Disponible au prochain versement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Chiffre d&apos;affaires
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEUR(summary.totalSales)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Montant brut (avant commission)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              CA net
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {formatEUR(summary.totalSales - summary.totalCommissions)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Après commission ({commissionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Prochain versement
            </CardTitle>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize">{nextPayoutDate}</div>
            <p className="text-xs text-gray-500 mt-1">
              Versement hebdomadaire le mardi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-4 flex items-center gap-4">
        <span className="text-sm text-gray-500 font-medium">Période :</span>
        <select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="text-sm font-medium text-gray-800 bg-[#f8f9fc] border border-[#e2e5f0] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/25 cursor-pointer"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Summary breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Récapitulatif financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Ventes nettes</span>
              <span className="font-semibold text-green-700">
                + {formatEUR(summary.totalSales)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Commissions prélevées</span>
              <span className="font-semibold text-orange-600">
                - {formatEUR(summary.totalCommissions)}
              </span>
            </div>
            {summary.totalRefunds > 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-gray-600">Remboursements</span>
                </div>
                <span className="font-semibold text-red-600">
                  - {formatEUR(summary.totalRefunds)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Versements effectués</span>
              <span className="font-semibold text-gray-700">
                - {formatEUR(summary.totalPayouts)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 pt-3">
              <span className="font-bold text-gray-900">Solde disponible</span>
              <span className="font-bold text-xl text-blue-700">
                {formatEUR(summary.netBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
