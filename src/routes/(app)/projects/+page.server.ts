import type { PageServerLoad } from './$types';
import { helpRequestService } from '$lib/server/help-request.service';

// Legacy-Projektseite: ausschließlich eigene Hilfsanfragen lesen.
// Erstellung erfolgt über die dedizierte Hilfsanfragen-Seite.
export const load: PageServerLoad = async ({ locals }) => ({
  projects: await helpRequestService.list(locals.user)
});
