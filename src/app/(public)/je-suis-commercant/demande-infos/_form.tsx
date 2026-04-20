"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Loader2, Mail } from "lucide-react";

const COMMERCE_TYPES = [
  { value: "boucherie", label: "Boucherie" },
  { value: "boulangerie", label: "Boulangerie / Pâtisserie" },
  { value: "epicerie", label: "Épicerie" },
  { value: "supermarche", label: "Supermarché" },
  { value: "restaurant", label: "Restaurant" },
  { value: "traiteur", label: "Traiteur" },
  { value: "autre", label: "Autre" },
];

const PLAN_OPTIONS = [
  { value: "undecided", label: "Je ne sais pas encore" },
  { value: "starter", label: "Starter (gratuit — 18 % de commission)" },
  { value: "pro", label: "Pro (29 €/mois — 12 % de commission)" },
];

export default function ProspectForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [commerceType, setCommerceType] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [planInterest, setPlanInterest] = useState("undecided");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Merci d'accepter d'être contacté par Kshare.");
      return;
    }
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          companyName: companyName.trim(),
          commerceType,
          city: city.trim(),
          postalCode: postalCode.trim() || undefined,
          planInterest,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Une erreur est survenue.");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200 p-8 md:p-10 text-center card-elevated">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-9 w-9 text-emerald-600" />
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
          Votre demande a bien été envoyée !
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4 max-w-md mx-auto">
          Vous allez recevoir toutes les informations sur Kshare à l&apos;adresse <strong>{email}</strong> dans quelques minutes.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          N&apos;hésitez pas à vérifier vos spams si vous ne recevez pas l&apos;email.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setFirstName("");
              setLastName("");
              setEmail("");
              setPhone("");
              setCompanyName("");
              setCommerceType("");
              setCity("");
              setPostalCode("");
              setPlanInterest("undecided");
              setMessage("");
              setConsent(false);
            }}
          >
            Envoyer une autre demande
          </Button>
          <Button asChild>
            <a href="/inscription-commercant">S&apos;inscrire maintenant</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl border border-[#e2e5f0]/60 p-6 md:p-10 space-y-6 card-elevated"
    >
      {/* Identité */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700 mb-2 block">
            Prénom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jean"
            required
            disabled={sending}
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700 mb-2 block">
            Nom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dupont"
            required
            disabled={sending}
          />
        </div>
      </div>

      {/* Contact */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
            Email professionnel <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@votrecommerce.fr"
            required
            disabled={sending}
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-2 block">
            Téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            disabled={sending}
          />
        </div>
      </div>

      {/* Commerce */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700 mb-2 block">
            Nom du commerce <span className="text-red-500">*</span>
          </Label>
          <Input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Boulangerie Levy"
            required
            disabled={sending}
          />
        </div>
        <div>
          <Label htmlFor="commerceType" className="text-sm font-semibold text-gray-700 mb-2 block">
            Type de commerce <span className="text-red-500">*</span>
          </Label>
          <Select
            value={commerceType}
            onValueChange={setCommerceType}
            disabled={sending}
            required
          >
            <SelectTrigger id="commerceType">
              <SelectValue placeholder="Choisir un type..." />
            </SelectTrigger>
            <SelectContent>
              {COMMERCE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Localisation */}
      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        <div>
          <Label htmlFor="city" className="text-sm font-semibold text-gray-700 mb-2 block">
            Ville <span className="text-red-500">*</span>
          </Label>
          <Input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Paris"
            required
            disabled={sending}
          />
        </div>
        <div>
          <Label htmlFor="postalCode" className="text-sm font-semibold text-gray-700 mb-2 block">
            Code postal <span className="text-gray-400 font-normal">(optionnel)</span>
          </Label>
          <Input
            id="postalCode"
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="75020"
            disabled={sending}
          />
        </div>
      </div>

      {/* Plan */}
      <div>
        <Label htmlFor="planInterest" className="text-sm font-semibold text-gray-700 mb-2 block">
          Quelle offre vous intéresse ?
        </Label>
        <Select value={planInterest} onValueChange={setPlanInterest} disabled={sending}>
          <SelectTrigger id="planInterest">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Message */}
      <div>
        <Label htmlFor="message" className="text-sm font-semibold text-gray-700 mb-2 block">
          Un message pour nous ? <span className="text-gray-400 font-normal">(optionnel)</span>
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Une question spécifique, un besoin particulier..."
          rows={3}
          disabled={sending}
        />
      </div>

      {/* Consentement */}
      <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#3744C8] focus:ring-[#3744C8]"
          required
          disabled={sending}
        />
        <label htmlFor="consent" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
          J&apos;accepte d&apos;être contacté par email par Kshare pour recevoir des informations
          sur leurs services destinés aux commerces casher.
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-12 bg-gradient-to-r from-[#3744C8] to-[#5B6EF5] text-white font-display font-semibold"
        disabled={sending || !consent}
      >
        {sending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Recevoir les informations
          </>
        )}
      </Button>
    </form>
  );
}
