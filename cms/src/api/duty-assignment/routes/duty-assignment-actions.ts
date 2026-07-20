/**
 * Custom members-only routes for self-managing duty assignments (sgim-pgx.11).
 * Both require an authenticated member (the 'authenticated' role must be granted
 * these actions — see bootstrap-permissions).
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/duty-assignments/:id/claim',
      handler: 'duty-assignment.claim',
    },
    {
      method: 'POST',
      path: '/duty-assignments/:id/release',
      handler: 'duty-assignment.release',
    },
  ],
};
