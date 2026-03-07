"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/shared/public-navbar";
import { MessageSquare, Mail, Send } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = `Nom: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:contact@k-share.fr?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#EEF0F8]">
      <PublicNavbar />

      {/* ─────────────── HERO ─────────────── */}
      <section className="py-16 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#3744C8] mb-5">
            Contactez-nous
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Une question ? Une suggestion ? Notre équipe est là pour vous accompagner dans
            votre démarche solidaire.
          </p>
        </div>
      </section>

      {/* ─────────────── FORM + COORDS ─────────────── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-[1fr_360px] gap-6 items-start">

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e5f0]/60 p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 bg-[#3744C8] rounded-xl flex items-center justify-center shadow-sm">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-[#3744C8]">Envoyez-nous un message</h2>
              </div>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Message envoyé !</h3>
                  <p className="text-gray-500 text-sm mb-6">Nous vous répondrons dans les plus brefs délais.</p>
                  <Button
                    variant="outline"
                    className="border-[#3744C8] text-[#3744C8] hover:bg-[#3744C8] hover:text-white"
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  >
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Votre nom"
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30 focus:border-[#3744C8] transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="votre@email.com"
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30 focus:border-[#3744C8] transition-colors"
                    />
                  </div>

                  {/* Sujet */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sujet <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                      placeholder="Objet de votre message"
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30 focus:border-[#3744C8] transition-colors"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      placeholder="Décrivez votre demande..."
                      rows={6}
                      className="w-full rounded-xl border border-[#e2e5f0] bg-[#f8f9fc] px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3744C8]/30 focus:border-[#3744C8] transition-colors resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[#3744C8] hover:bg-[#2B38B8] text-white h-12 rounded-xl shadow-sm font-semibold"
                  >
                    <Send className="mr-2.5 h-4 w-4" />
                    Envoyer le message
                  </Button>
                </form>
              )}
            </div>

            {/* Coordonnées card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e5f0]/60 p-8">
              <h2 className="text-xl font-bold text-[#3744C8] mb-6">Nos coordonnées</h2>

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

          </div>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="bg-[#0F1B40] text-white pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-blue-200 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#3744C8] font-bold text-sm leading-none">K</span>
              </div>
              <span className="font-semibold">Kshare</span>
              <span className="text-blue-300">·</span>
              <span>© 2024 Tous droits réservés.</span>
            </div>
            <a href="mailto:contact@k-share.fr" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              contact@k-share.fr
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
