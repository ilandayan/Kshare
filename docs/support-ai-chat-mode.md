# 🔄 Bascule Kira : mode "email" → mode "messagerie"

> **Statut actuel (avril 2026)** : Kira répond en mode **email** car l'interface messagerie
> côté client n'est pas encore disponible dans l'app mobile publiée sur les stores.
>
> **À activer** dès que la nouvelle version de l'app (>= 1.0.x avec pages `profil/mes-demandes.tsx`
> et `profil/demande/[id].tsx`) sera **publiée et majoritairement installée** par les clients.

---

## Contexte

Kira est l'IA de support Kshare. Elle peut répondre automatiquement aux demandes simples
via la FAQ, les commandes du client (tool `get_order_status`) et les apprentissages admin.

Aujourd'hui, le client reçoit la réponse de Kira **par email** (accusé + email avec la réponse IA).
Demain, le client lira les réponses directement dans l'app, dans une interface style WhatsApp.

---

## Checklist de bascule

### 1. Vérifier que l'app est déployée et adoptée

- [ ] Version app mobile avec `mes-demandes.tsx` et `demande/[id].tsx` poussée sur les 2 stores
- [ ] Au moins 80-90 % des clients actifs ont la nouvelle version (vérifier via Mixpanel ou analytics)
- [ ] L'endpoint `/api/contact` crée bien le ticket avec `client_id` (déjà en place)
- [ ] Les tickets sont bien lisibles par le client via RLS (déjà configuré : `tickets_select_own`)

### 2. Modifier le prompt Kira (`src/lib/support-ai.ts`)

Remplacer la règle #6 du `SYSTEM_PROMPT` par le style messagerie :

```
6. **Ton — STYLE MESSAGERIE INSTANTANÉE (obligatoire)** :
   Le client lit ta réponse dans une interface de chat (bulles de messages), PAS dans un email.
   Adapte-toi à ce canal :
   - 🚫 PAS de formule d'ouverture ("Bonjour Marc,", "Cher client,", "Madame,")
   - 🚫 PAS de signature ("L'équipe Kshare", "Cordialement", "Bien à vous")
   - 🚫 PAS de phrases longues ni de paragraphes
   - ✅ Phrases COURTES, directes, comme en WhatsApp/SMS
   - ✅ Ton humain, chaleureux mais NATUREL
   - ✅ Emojis avec parcimonie (1-2 max si vraiment pertinent)
   - ✅ Vouvoiement poli mais direct (par défaut)
   - ✅ 1 à 4 phrases max, idéalement 2-3
   - ✅ Peut finir par une question simple ("Cela répond à votre question ?")
   - ❌ Ne JAMAIS dire "N'hésitez pas à nous recontacter" — c'est un chat, le client peut juste répondre

   Exemples BONS :
   • "Oui, c'est possible jusqu'à la préparation du panier. Envoyez-moi votre numéro de commande et je vérifie."
   • "Le créneau de retrait s'affiche sur la fiche du panier dans l'app 👍"
   • "Pour ça, l'équipe va regarder en détail. Je leur transmets votre demande."

   Exemples MAUVAIS (style email à éviter) :
   ✗ "Bonjour Marc, nous vous remercions de votre message..."
   ✗ "Cordialement, l'équipe Kshare"
   ✗ "N'hésitez pas à nous recontacter si besoin d'informations complémentaires"
```

### 3. Adapter l'email envoyé au client (`src/app/api/contact/route.ts`)

Option A — **Supprimer l'email de réponse IA aux clients connectés** (recommandé)
Le client verra la réponse directement dans l'app + push notification.

```ts
// Après récupération du clientId, si clientId existe ET rôle = "client" :
const isAppClient = clientId !== null /* && profile.role === 'client' */;

if (!isAppClient && triage?.canAutoResolve && triage.autoResponse) {
  // Envoyer l'email comme aujourd'hui (clients web non connectés à l'app)
  await sendEmail({ ... });
}
```

Option B — **Remplacer le HTML par un format "notification messagerie"** (si on garde l'email)

```html
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;">
  <p style="color:#888;font-size:13px;margin:0 0 6px;">Nouveau message sur votre demande ${ticketRef}</p>
  <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:16px;border-bottom-left-radius:4px;padding:14px 16px;margin:12px 0;">
    <div style="font-size:12px;font-weight:700;color:#7C3AED;margin-bottom:6px;">
      ✨ Kira · Assistante Kshare
    </div>
    <div style="color:#111827;font-size:15px;line-height:1.5;white-space:pre-wrap;">${safeAutoResponse}</div>
  </div>
  <p style="color:#666;font-size:13px;line-height:1.6;margin:16px 0 8px;">
    Vous pouvez répondre directement dans l'app Kshare (Profil → Mes demandes) pour continuer la conversation.
  </p>
  <p style="color:#aaa;font-size:11px;margin-top:24px;">Réf. ${ticketRef}</p>
</div>
```

### 4. Ajouter des notifications push (optionnel mais recommandé)

Quand l'admin ou Kira répond à un ticket :

1. Récupérer le `push_token` du client depuis `push_tokens`
2. Envoyer une push via l'edge function `send-push-notification` :
   - Titre : "Nouveau message de l'équipe Kshare"
   - Corps : premiers 80 caractères de la réponse
   - Data : `{ type: 'ticket_reply', ticketId: '...' }`
3. Côté app mobile (`usePushNotifications.ts`), gérer le `type: 'ticket_reply'` → naviguer vers `/profil/demande/[id]`

### 5. Cas à conserver en email classique

Même après la bascule, continuer à envoyer les emails complets dans ces cas :

- Demande depuis le **formulaire web public** (`/contact`) sans être connecté
- Demande d'un **commerçant** (pas d'interface messagerie pour eux)
- Demande d'une **association** (idem)
- Demande d'un **admin** (idem)

La détection se fait via `clientId !== null` et idéalement via le rôle du profil.

### 6. Vérifier que tout fonctionne

- [ ] Créer un ticket depuis l'app → vérifier qu'il apparaît dans "Mes demandes"
- [ ] Vérifier que la réponse Kira arrive dans le chat (et pas par email si Option A)
- [ ] Admin répond depuis `/kshare-admin/support` → vérifier que le client voit la réponse dans l'app
- [ ] Client répond dans l'app → vérifier que l'admin voit la réponse
- [ ] Le statut "résolu" se remet en "in_progress" si le client répond après résolution (déjà codé)

### 7. Communication

- [ ] Annoncer le changement aux utilisateurs (dans l'app ou par email unique)
- [ ] Mettre à jour la FAQ si besoin
- [ ] Mettre à jour la page `/suppression-compte` et `/faq` si elles mentionnent "par email"

---

## Rollback d'urgence

Si problème majeur après bascule, revert :

1. Remettre le prompt email dans `support-ai.ts`
2. Remettre le HTML email dans `contact/route.ts`
3. Pas besoin de toucher à l'app mobile — elle affichera juste les messages déjà reçus en email

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/lib/support-ai.ts` | Prompt système de Kira (règle #6 à modifier) |
| `src/app/api/contact/route.ts` | Envoi des emails + création du ticket |
| `kshare-mobile/app/profil/mes-demandes.tsx` | Liste des demandes côté client |
| `kshare-mobile/app/profil/demande/[id].tsx` | Détail du ticket (style chat) |
| `kshare-mobile/app/profil/support.tsx` | Menu support mobile (lien vers "Mes demandes" déjà ajouté) |
| `kshare-mobile/lib/usePushNotifications.ts` | Gestion des push (à compléter avec `ticket_reply`) |
| `supabase/functions/send-push-notification/` | Edge function push (déjà existante) |

---

_Document créé : avril 2026_
