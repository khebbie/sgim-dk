/**
 * Duty-assignment controller with members-only self-management (sgim-pgx.11).
 * `claim` takes an open slot; `release` frees the caller's own slot. A member
 * can only ever act on an open slot (claim) or their own assignment (release) —
 * never someone else's.
 */
import { factories } from '@strapi/strapi';

const UID = 'api::duty-assignment.duty-assignment';
const POPULATE = { member: true, category: true, event: true } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any;

// Roster shape: member is a Users&Permissions relation that the default API
// sanitises away, so we override find to return just the safe fields members
// need to read the roster (assignee username, category, event).
const ROSTER_POPULATE = {
  member: { fields: ['username'] },
  category: { fields: ['name', 'order'] },
  event: { fields: ['title', 'slug', 'startDate', 'endDate', 'eventType'] },
} as const;

export default factories.createCoreController(UID, ({ strapi }) => ({
  async find(ctx: Ctx) {
    const items = await strapi.documents(UID).findMany({
      populate: ROSTER_POPULATE as never,
      pagination: { pageSize: 500 },
      sort: ['event.startDate:asc', 'category.order:asc'],
    });
    ctx.body = { data: items };
  },

  async claim(ctx: Ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const documentId = ctx.params.id;

    const assignment = await strapi
      .documents(UID)
      .findOne({ documentId, populate: { member: true } });
    if (!assignment) return ctx.notFound();
    if (assignment.member) return ctx.throw(409, 'Tjansen er allerede taget');

    const updated = await strapi
      .documents(UID)
      .update({ documentId, data: { member: user.id } as never, populate: POPULATE });
    ctx.body = { data: updated };
  },

  async release(ctx: Ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const documentId = ctx.params.id;

    const assignment = await strapi
      .documents(UID)
      .findOne({ documentId, populate: { member: true } });
    if (!assignment) return ctx.notFound();
    if (!assignment.member || assignment.member.id !== user.id) {
      return ctx.forbidden('Det er ikke din tjans');
    }

    const updated = await strapi
      .documents(UID)
      .update({ documentId, data: { member: null } as never, populate: POPULATE });
    ctx.body = { data: updated };
  },
}));
