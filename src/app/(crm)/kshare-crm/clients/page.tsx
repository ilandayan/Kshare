import { listerClients, seuilBasculePro } from "@/lib/crm/clients";
import { ClientsClient } from "@/components/crm/clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listerClients();

  return <ClientsClient clients={clients} seuilPro={seuilBasculePro()} />;
}
