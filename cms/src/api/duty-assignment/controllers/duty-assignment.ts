/**
 * Duty-assignment controller — derived ("shadow") duties (sgim-3ya.5).
 *
 * Open slots are NOT stored: every event implicitly has one slot per duty
 * category, computed in the website UI. A duty-assignment row exists only once
 * someone has been assigned to a slot. The assignee is just a free-text name —
 * any logged-in member can assign or clear anyone (no ownership).
 *   - assign (claim) -> upsert a row for (event, category) with the name
 *   - clear (release) -> delete the row
 *   - find            -> the assigned rows
 */
import { factories } from '@strapi/strapi';

const UID = 'api::duty-assignment.duty-assignment';
const POPULATE = { category: true, event: true } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any;

const ROSTER_POPULATE = {
  category: { fields: ['name', 'order'] },
  event: { fields: ['title', 'slug', 'startDate', 'endDate', 'eventType'] },
} as const;

export default factories.createCoreController(UID, ({ strapi }) => ({
  async find(ctx: Ctx) {
    // Only assigned rows exist; grid assembly + sorting happen in the web layer.
    const items = await strapi.documents(UID).findMany({
      populate: ROSTER_POPULATE as never,
      pagination: { pageSize: 2000 },
    });
    ctx.body = { data: items };
  },

  async claim(ctx: Ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const body = (ctx.request.body?.data ?? ctx.request.body ?? {}) as {
      event?: string;
      category?: string;
      assignee?: string;
    };
    const event = body.event;
    const category = body.category;
    const assignee = (body.assignee ?? '').trim();
    if (!event || !category || !assignee) {
      return ctx.badRequest('event, category and assignee are required');
    }

    // A slot is (event, category). Reassigning is allowed, so upsert.
    const [existing] = await strapi.documents(UID).findMany({
      filters: {
        event: { documentId: { $eq: event } },
        category: { documentId: { $eq: category } },
      } as never,
      pagination: { pageSize: 1 },
    });

    const saved = existing
      ? await strapi.documents(UID).update({
          documentId: existing.documentId,
          data: { assignee } as never,
          populate: POPULATE,
        })
      : await strapi
          .documents(UID)
          .create({ data: { event, category, assignee } as never, populate: POPULATE });
    ctx.body = { data: saved };
  },

  async release(ctx: Ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const documentId = ctx.params.id;

    const assignment = await strapi.documents(UID).findOne({ documentId });
    if (!assignment) return ctx.notFound();

    await strapi.documents(UID).delete({ documentId });
    ctx.body = { data: { documentId } };
  },
}));
