import { HttpError } from "../../shared/http";
import * as repo from "./clients.repo";

export function listClients(tenantId: string, search = "") {
  return repo.listClients(tenantId, search);
}

export function listClientProjects(tenantId: string) {
  return repo.listClientProjects(tenantId);
}

export function createClient(params: { tenantId: string; name: string; notes: string; actorId: string }) {
  return repo.createClient(params);
}

export async function updateClient(params: { tenantId: string; clientId: string; name?: string; notes: string }) {
  const before = await repo.getClientById(params.tenantId, params.clientId);
  if (!before) throw new HttpError(404, "Client not found");

  const after = await repo.updateClient(params);
  return { before, after };
}
