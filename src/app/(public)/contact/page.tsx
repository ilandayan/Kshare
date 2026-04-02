"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { SharedFooter } from "@/components/shared/footer";
import {
  MessageSquare,
  Mail,
  Send,
  Loader2,
  HelpCircle,
  ShoppingBag,
  Store,
  Heart,
  Bug,
  Handshake,
  CheckCircle,
  Sparkles,
  User,
  Building2,
  CreditCard,
  FileText,
  type LucideIcon,
} from "lucide-react";

// ── Type d'espace ─────────────────────────────────────────────

type ContactSpace = "client" | "commerce" | "association";

const SPACES: {
  value: ContactSpace;
  label: string;
  icon: LucideIcon;
  description: string;
  selectedBorder: string;
  selectedBg: string;
  selectedRing: string;
  selectedIconBg: string;
  selectedText: string;
}[] = [
  {
    value: "client",
    label: "Je suis client",
    icon: User,
    description: "Commande, remboursement, question sur l'app...",
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50",
    selectedRing: "ring-emerald-200",
    selectedIconBg: "bg-emerald-500",
    selectedText: "text-emerald-700",
  },
  {
    value: "commerce",
    label: "Je suis commerçant",
    icon: Store,
    description: "Inscription, abonnement, gestion de paniers...",
    selectedBorder: "border-[#3744C8]",
    selectedBg: "bg-[#3744C8]/5",
    selectedRing: "ring-[#3744C8]/20",
    selectedIconBg: "bg-[#3744C8]",
    selectedText: "text-[#3744C8]",
  },
  {
    value: "association",
    label: "Je suis une association",
    icon: Heart,
    description: "Programme dons, réservation de paniers...",
    selectedBorder: "border-purple-500",
    selectedBg: "bg-purple-50",
    selectedRing: "ring-purple-200",
    selectedIconBg: "bg-purple-500",
    selectedText: "text-purple-700",
  },
];

// ── Catégories par espace ─────────────────────────────────────

type CategoryItem = { value: string; label: string; icon: LucideIcon };

const CLIENT_CATEGORIES: CategoryItem[] = [
  { value: "question_generale", label: "Question générale", icon: HelpCircle },
  { value: "probleme_commande", label: "Problème commande", icon: ShoppingBag },
  { value: "bug_technique", label: "Bug technique", icon: Bug },
  { value: "autre", label: "Autre", icon: MessageSquare },
];

const COMMERCE_CATEGORIES: CategoryItem[] = [
  { value: "inscription_commerce", label: "Inscription", icon: Store },
  { value: "abonnement_facturation", label: "Abonnement / Facturation", icon: CreditCard },
  { value: "question_generale", label: "Question générale", icon: HelpCircle },
  { value: "partenariat", label: "Partenariat / Presse", icon: Handshake },
  { value: "bug_technique", label: "Bug technique", icon: Bug },
  { value: "autre", label: "Autre", icon: FileText },
];

const ASSOCIATION_CATEGORIES: CategoryItem[] = [
  { value: "inscription_association", label: "Inscription", icon: Heart },
  { value: "question_generale", label: "Question générale", icon: HelpCircle },
  { value: "partenariat", label: "Partenariat / Presse", icon: Handshake },
  { value: "bug_technique", label: "Bug technique", icon: Bug },
  { value: "autre", label: "Autre", icon: FileText },
];

const CATEGORIES_MAP: Record<ContactSpace, CategoryItem[]> = {
  client: CLIENT_CATEGORIES,
  commerce: COMMERCE_CATEGORIES,
  association: ASSOCIATION_CATEGORIES,
};

// ── Types ─────────────────────────────────────────────────────

interface SubmitResult {
  ticketRef: string;
  aiAutoResolved: boolean;
}

interface ContactForm {
  space: ContactSpace | "";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  subject: string;
  message: string;
  category: string;
}

const INITIAL_FORM: ContactForm = {
  space: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  companyName: "",
  subject: "",
  message: "",
  category: "",
};

// ── Page ──────────────────────────────────────────────────────

export default function ContactPage() {
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>({ ...INITIAL_FORM });

  const isPro = form.space === "commerce" || form.space === "association";
  const categories = form.space ? CATEGORIES_MAP[form.space] : [];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function selectSpace(value: ContactSpace) {
    setForm((prev) => ({
      ...prev,
      space: value,
      category: "",
      companyName: "",
      phone: "",
    }));
    setError(null);
  }

  function selectCategory(value: string) {
    setForm((prev) => ({ ...prev, category: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.space) {
      setError("Veuillez choisir votre profil.");
      return;
    }
    if (!form.category) {
      setError("Veuillez sélectionner une catégorie.");
      return;
    }
    if (isPro && !form.companyName.trim()) {
      setError(
        form.space === "association"
          ? "Le nom de l'association est requis."
          : "Le nom du commerce est requis."
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        space: form.space,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        phone: isPro ? form.phone.trim() || undefined : undefined,
        companyName: isPro ? form.companyName.trim() : undefined,
        companyType: isPro ? form.space : undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
        category: form.category,
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de l'envoi du message.");
      }

      const data = (await response.json()) as {
        ticketRef?: string;
        aiAutoResolved?: boolean;
      };

      setSubmitted({
        ticketRef: data.ticketRef ?? "—",
        aiAutoResolved: data.aiAutoResolved ?? false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30 focus:border-[#3744C8] transition-colors";

  const subjectPlaceholder: Record<ContactSpace, string> = {
    client: "Ex : Ma commande n'a pas été préparée",
    commerce: "Ex : Question sur mon abonnement",
    association: "Ex : Disponibilité des paniers dons",
  };

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ─────────────── CONTACT ─────────────── */}
      <section className="relative py-24 md:py-40 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,#c8cef5_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#9ba8d8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.15]" />

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-14">
          <h1 className="anim-hidden animate-fade-in-up text-4xl md:text-5xl font-bold text-[#3744C8] mb-5">
            Contactez-nous
          </h1>
          <p className="anim-hidden animate-fade-in-up delay-100 text-gray-500 text-lg leading-relaxed">
            Une question ? Une suggestion ? Notre équipe est là pour vous
            accompagner dans votre démarche solidaire.
          </p>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-[1fr_360px] gap-6 items-start">
            {/* Form card */}
            <div className="anim-hidden animate-fade-in-up delay-200 bg-white rounded-2xl shadow-sm border border-[#e2e5f0]/60 p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 bg-[#3744C8] rounded-xl flex items-center justify-center shadow-sm">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-[#3744C8]">
                  Envoyez-nous un message
                </h2>
              </div>

              {submitted ? (
                /* ─── Confirmation ─── */
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Message envoyé !
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">
                    Référence de suivi :{" "}
                    <span className="font-mono font-semibold text-[#3744C8]">
                      {submitted.ticketRef}
                    </span>
                  </p>

                  {submitted.aiAutoResolved ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 mb-6 max-w-sm mx-auto">
                      <div className="flex items-center justify-center gap-2 text-blue-700 text-sm font-semibold mb-1">
                        <Sparkles className="h-4 w-4" />
                        Réponse instantanée envoyée
                      </div>
                      <p className="text-blue-600 text-xs">
                        Notre assistant IA a trouvé une réponse à votre
                        question. Consultez votre boîte email !
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-6">
                      Un accusé de réception a été envoyé à votre adresse email.
                      <br />
                      Nous vous répondrons dans les plus brefs délais.
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="border-[#3744C8] text-[#3744C8] hover:bg-[#3744C8] hover:text-white cursor-pointer"
                    onClick={() => {
                      setSubmitted(null);
                      setForm({ ...INITIAL_FORM });
                    }}
                  >
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                /* ─── Formulaire ─── */
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* ═══ ÉTAPE 1 : Choix du profil (3 cartes) ═══ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2.5">
                      Vous êtes <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {SPACES.map((sp) => {
                        const Icon = sp.icon;
                        const selected = form.space === sp.value;
                        return (
                          <button
                            key={sp.value}
                            type="button"
                            onClick={() => selectSpace(sp.value)}
                            className={`relative flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                              selected
                                ? `${sp.selectedBorder} ${sp.selectedBg} ring-2 ${sp.selectedRing}`
                                : "border-[#e2e5f0] bg-[#f8f9fc] hover:border-gray-300 hover:bg-white"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${
                                selected ? sp.selectedIconBg : "bg-gray-200"
                              }`}
                            >
                              <Icon
                                className={`h-5 w-5 ${
                                  selected ? "text-white" : "text-gray-500"
                                }`}
                              />
                            </div>
                            <span
                              className={`text-xs sm:text-sm font-semibold leading-tight ${
                                selected ? sp.selectedText : "text-gray-700"
                              }`}
                            >
                              {sp.label}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-gray-400 leading-tight hidden sm:block">
                              {sp.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ═══ Suite du formulaire (visible après choix du profil) ═══ */}
                  {form.space && (
                    <div className="space-y-5 animate-fade-in-up">

                      {/* ── Catégorie ── */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de demande <span className="text-red-500">*</span>
                        </label>
                        <div className={`grid gap-2 ${
                          categories.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                        }`}>
                          {categories.map((cat) => {
                            const Icon = cat.icon;
                            const selected = form.category === cat.value;
                            return (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => selectCategory(cat.value)}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                  selected
                                    ? "border-[#3744C8] bg-[#3744C8]/5 ring-2 ring-[#3744C8]/20"
                                    : "border-[#e2e5f0] bg-[#f8f9fc] hover:border-[#3744C8]/30 hover:bg-[#3744C8]/[0.02]"
                                }`}
                              >
                                <Icon
                                  className={`h-5 w-5 ${
                                    selected ? "text-[#3744C8]" : "text-gray-400"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-medium leading-tight ${
                                    selected ? "text-[#3744C8]" : "text-gray-600"
                                  }`}
                                >
                                  {cat.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Bloc commerçant : Nom du commerce ── */}
                      {form.space === "commerce" && (
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Store className="h-4 w-4 text-[#3744C8]" />
                            <span className="text-xs font-semibold text-[#3744C8] uppercase tracking-wide">
                              Informations commerce
                            </span>
                          </div>
                          <div>
                            <label
                              htmlFor="contact-companyName"
                              className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                              Nom du commerce <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="contact-companyName"
                              name="companyName"
                              value={form.companyName}
                              onChange={handleChange}
                              required
                              placeholder="Ex : Boulangerie Shalom"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      )}

                      {/* ── Bloc association : Nom de l'association ── */}
                      {form.space === "association" && (
                        <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Heart className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                              Informations association
                            </span>
                          </div>
                          <div>
                            <label
                              htmlFor="contact-companyName"
                              className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                              Nom de l&apos;association <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="contact-companyName"
                              name="companyName"
                              value={form.companyName}
                              onChange={handleChange}
                              required
                              placeholder="Ex : Association Solidarité Casher"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      )}

                      {/* ── Nom / Prénom ── */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="contact-lastName"
                            className="block text-sm font-medium text-gray-700 mb-1.5"
                          >
                            Nom <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="contact-lastName"
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            required
                            placeholder="Dupont"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="contact-firstName"
                            className="block text-sm font-medium text-gray-700 mb-1.5"
                          >
                            Prénom <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="contact-firstName"
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            required
                            placeholder="Jean"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* ── Email (+ Téléphone si pro) ── */}
                      <div className={`grid gap-3 ${isPro ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                        <div>
                          <label
                            htmlFor="contact-email"
                            className="block text-sm font-medium text-gray-700 mb-1.5"
                          >
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            placeholder="votre@email.com"
                            className={inputCls}
                          />
                        </div>
                        {isPro && (
                          <div>
                            <label
                              htmlFor="contact-phone"
                              className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                              Téléphone <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="contact-phone"
                              name="phone"
                              type="tel"
                              value={form.phone}
                              onChange={handleChange}
                              required
                              placeholder="06 12 34 56 78"
                              className={inputCls}
                            />
                          </div>
                        )}
                      </div>

                      {/* ── Sujet ── */}
                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="block text-sm font-medium text-gray-700 mb-1.5"
                        >
                          Sujet <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="contact-subject"
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          required
                          placeholder={form.space ? subjectPlaceholder[form.space] : ""}
                          className={inputCls}
                        />
                      </div>

                      {/* ── Message ── */}
                      <div>
                        <label
                          htmlFor="contact-message"
                          className="block text-sm font-medium text-gray-700 mb-1.5"
                        >
                          Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="contact-message"
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          placeholder="Décrivez votre demande en détail..."
                          rows={5}
                          className={`${inputCls} resize-none`}
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full bg-[#3744C8] hover:bg-[#2B38B8] text-white h-12 rounded-xl shadow-sm font-semibold cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2.5 h-4 w-4" />
                            Envoyer le message
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Coordonnées + info IA */}
            <div className="anim-hidden animate-fade-in-up delay-300 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-[#e2e5f0]/60 p-8">
                <h2 className="text-xl font-bold text-[#3744C8] mb-6">
                  Nos coordonnées
                </h2>

                <a
                  href="mailto:contact@k-share.fr"
                  className="flex items-center gap-4 p-4 bg-[#EEF0F8] rounded-xl hover:bg-[#e4e7f4] transition-colors group"
                >
                  <div className="w-10 h-10 bg-[#3744C8] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Email</div>
                    <div className="text-sm font-semibold text-[#3744C8] group-hover:underline">
                      contact@k-share.fr
                    </div>
                  </div>
                </a>
              </div>

              {/* Info IA */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100/60 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-[#3744C8]" />
                  <h3 className="text-sm font-bold text-[#3744C8]">
                    Réponse rapide
                  </h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Pour les questions fréquentes, notre assistant IA peut vous
                  répondre <strong>instantanément</strong>. Les demandes
                  complexes sont transmises directement à notre équipe.
                </p>
              </div>

              {/* Info contextuelle commerçant */}
              {form.space === "commerce" && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-100/60 p-6 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-700">
                      Espace commerçant
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Déjà inscrit ? Connectez-vous à votre{" "}
                    <a href="/connexion" className="text-[#3744C8] font-semibold hover:underline">
                      espace commerçant
                    </a>{" "}
                    pour accéder au support dédié et gérer vos paniers.
                  </p>
                </div>
              )}

              {/* Info contextuelle association */}
              {form.space === "association" && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-purple-100/60 p-6 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-5 w-5 text-purple-600" />
                    <h3 className="text-sm font-bold text-purple-700">
                      Espace association
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Déjà inscrite ? Connectez-vous à votre{" "}
                    <a href="/connexion" className="text-purple-600 font-semibold hover:underline">
                      espace association
                    </a>{" "}
                    pour réserver des paniers dons et suivre vos collectes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SharedFooter variant="minimal" />
    </div>
  );
}
