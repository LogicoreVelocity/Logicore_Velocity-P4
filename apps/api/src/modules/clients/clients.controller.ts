import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { audit } from "../../shared/audit";
import * as service from "./clients.service";

const CreateClientSchema = z.object({
  name: z.string().min(2),
  notes: z.string().min(1),
});

const UpdateClientSchema = z.object({
  name: z.string().min(2).optional(),
  notes: z.string().min(1),
});

export async function listClientsController(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search ? String(req.query.search) : "";
    const data = await service.listClients(req.tenantId!, search);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function listClientProjectsController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listClientProjects(req.tenantId!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createClientController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = CreateClientSchema.parse(req.body);
    const client = await service.createClient({
      tenantId: req.tenantId!,
      name: body.name,
      notes: body.notes,
      actorId: req.user!.id,
    });

    await audit(req, {
      action: "CLIENT_CREATE",
      entity_type: "CLIENT",
      entity_id: client.id,
      notes: body.notes,
      after_json: client,
    });

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

export async function updateClientController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = UpdateClientSchema.parse(req.body);
    const { before, after } = await service.updateClient({
      tenantId: req.tenantId!,
      clientId: req.params.clientId,
      name: body.name,
      notes: body.notes,
    });

    await audit(req, {
      action: "CLIENT_UPDATE",
      entity_type: "CLIENT",
      entity_id: req.params.clientId,
      notes: body.notes,
      before_json: before,
      after_json: after,
    });

    res.json(after);
  } catch (err) {
    next(err);
  }
}
