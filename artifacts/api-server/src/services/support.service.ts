import { SupportRepository } from "../repositories/support.repository.js";
import { createError } from "../middlewares/error.js";
import type { CreateTicketBody } from "../schema/support.schema.js";

type TicketRow = Awaited<ReturnType<typeof SupportRepository.findById>>;

function toTicketResponse(ticket: NonNullable<TicketRow>) {
  return {
    id: ticket.id,
    userId: ticket.userId,
    category: ticket.category as "deposit" | "delivery" | "wrong_info" | "account" | "other",
    message: ticket.message,
    photos: (ticket.photos as string[]) ?? [],
    status: ticket.status as "open" | "in_progress" | "resolved" | "closed",
    replies: (ticket.replies as Array<{ from: string; message: string; createdAt: string }>) ?? [],
    createdAt: ticket.createdAt.toISOString(),
  };
}

export const SupportService = {
  async createTicket(userId: string, body: CreateTicketBody) {
    const ticket = await SupportRepository.create({
      userId,
      category: body.category,
      message: body.message,
      photos: body.photos ?? [],
      replies: [],
    });
    return toTicketResponse(ticket);
  },

  async getUserTickets(userId: string) {
    const tickets = await SupportRepository.findByUser(userId);
    return { tickets: tickets.map(toTicketResponse) };
  },
};
