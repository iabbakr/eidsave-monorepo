import { GroupRepository } from "../repositories/group.repository.js";
import { WalletRepository } from "../repositories/wallet.repository.js";
import { createError } from "../middlewares/error.js";
import type { CreateGroupBody, ContributeBody } from "../schema/groups.schema.js";

const DEFAULT_COW_PRICE = 600000;

type GroupRow = Awaited<ReturnType<typeof GroupRepository.findById>>;

function toGroupResponse(
  group: NonNullable<GroupRow>,
  memberCount: number,
  isMember: boolean,
  myContribution: number,
) {
  const current = parseFloat(group.currentBalance as string);
  const target = parseFloat(group.targetAmount as string);
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    adminUid: group.adminUid,
    memberCount,
    memberLimit: group.memberLimit,
    targetAmount: target,
    currentBalance: current,
    progressPercent: target > 0 ? Math.min((current / target) * 100, 100) : 0,
    animalId: group.animalId ?? null,
    deliveryAddress: (group.deliveryAddress as object | null) ?? null,
    status: group.status as "open" | "funded" | "ordered" | "delivered" | "closed",
    eidType: "fitr" as const,
    isMember,
    myContribution,
    createdAt: group.createdAt.toISOString(),
  };
}

export const GroupService = {
  async listGroups(userId: string) {
    const groups = await GroupRepository.findAll();
    const enriched = await Promise.all(
      groups.map(async g => {
        const members = await GroupRepository.findMembers(g.id);
        const mine = members.find(m => m.userId === userId);
        return toGroupResponse(
          g,
          members.length,
          !!mine,
          mine ? parseFloat(mine.totalContribution as string) : 0,
        );
      }),
    );
    return { groups: enriched };
  },

  async getGroup(groupId: string, userId: string) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw createError("Group not found", 404);
    const members = await GroupRepository.findMembers(groupId);
    const mine = members.find(m => m.userId === userId);
    return toGroupResponse(group, members.length, !!mine, mine ? parseFloat(mine.totalContribution as string) : 0);
  },

  async createGroup(userId: string, body: CreateGroupBody) {
    const group = await GroupRepository.create({
      name: body.name,
      description: body.description,
      adminUid: userId,
      memberLimit: body.memberLimit,
      targetAmount: (body.targetAmount ?? DEFAULT_COW_PRICE).toString(),
      animalId: body.animalId,
      eidType: "fitr",
    });
    await GroupRepository.addMember({ groupId: group.id, userId });
    return toGroupResponse(group, 1, true, 0);
  },

  async joinGroup(groupId: string, userId: string) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw createError("Group not found", 404);

    const members = await GroupRepository.findMembers(groupId);
    if (members.length >= group.memberLimit) throw createError("Group is full", 400);

    if (members.find(m => m.userId === userId)) throw createError("Already a member", 400);

    await GroupRepository.addMember({ groupId, userId });
    return { message: "Joined group successfully" };
  },

  async contribute(groupId: string, userId: string, body: ContributeBody) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw createError("Group not found", 404);

    const membership = await GroupRepository.findMembership(groupId, userId);
    if (!membership) throw createError("Not a member of this group", 403);

    const wallet = await WalletRepository.findByUserAndType(userId, "fitr");
    if (!wallet) throw createError("Fitr wallet not found", 404);

    const balance = parseFloat(wallet.balance as string);
    if (balance < body.amount) throw createError("Insufficient wallet balance", 400);

    await GroupRepository.addContribution({ groupId, userId, amount: body.amount.toString() });

    const newMemberTotal = (parseFloat(membership.totalContribution as string) + body.amount).toFixed(2);
    await GroupRepository.updateMember(membership.id, newMemberTotal);

    const newGroupBalance = (parseFloat(group.currentBalance as string) + body.amount).toFixed(2);
    await GroupRepository.update(groupId, { currentBalance: newGroupBalance });

    const newWalletBalance = (balance - body.amount).toFixed(2);
    await WalletRepository.updateBalance(wallet.id, newWalletBalance, userId, "fitr");

    return { message: "Contribution successful" };
  },
};
