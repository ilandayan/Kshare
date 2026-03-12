import { describe, it, expect } from "vitest";
import { ORDER_NOTIFICATIONS } from "@/lib/notifications";

describe("ORDER_NOTIFICATIONS templates", () => {
  it("generates correct notification for paid status", () => {
    const notif = ORDER_NOTIFICATIONS.paid("Boucherie Moché");
    expect(notif.title).toContain("Commande confirmee");
    expect(notif.body).toContain("Boucherie Moché");
    expect(notif.body).toContain("code");
    expect(notif.type).toBe("order_paid");
  });

  it("generates correct notification for ready_for_pickup", () => {
    const notif = ORDER_NOTIFICATIONS.ready_for_pickup("Fromagerie Eden");
    expect(notif.title).toContain("pret");
    expect(notif.body).toContain("Fromagerie Eden");
    expect(notif.type).toBe("order_ready");
  });

  it("generates correct notification for picked_up", () => {
    const notif = ORDER_NOTIFICATIONS.picked_up("Traiteur Shalom");
    expect(notif.title).toContain("confirme");
    expect(notif.body).toContain("Traiteur Shalom");
    expect(notif.type).toBe("order_picked_up");
  });

  it("generates correct notification for no_show", () => {
    const notif = ORDER_NOTIFICATIONS.no_show("Supermarché Casher");
    expect(notif.title).toContain("non retire");
    expect(notif.body).toContain("Supermarché Casher");
    expect(notif.type).toBe("order_no_show");
  });

  it("all templates return required fields", () => {
    const statuses = ["paid", "ready_for_pickup", "picked_up", "no_show"] as const;
    for (const status of statuses) {
      const notif = ORDER_NOTIFICATIONS[status]("Test Commerce");
      expect(notif).toHaveProperty("title");
      expect(notif).toHaveProperty("body");
      expect(notif).toHaveProperty("type");
      expect(notif.title.length).toBeGreaterThan(0);
      expect(notif.body.length).toBeGreaterThan(0);
    }
  });
});
