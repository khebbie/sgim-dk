/**
 * Custom members-only routes for self-managing duty assignments (sgim-pgx.11).
 * Both require an authenticated member (the 'authenticated' role must be granted
 * these actions — see bootstrap-permissions).
 */
export default {
  routes: [
    {
      // claim creates a row from { event, category } in the body (no id yet).
      method: 'POST',
      path: '/duty-assignments/claim',
      handler: 'duty-assignment.claim',
    },
    {
      method: 'POST',
      path: '/duty-assignments/:id/release',
      handler: 'duty-assignment.release',
    },
  ],
};
