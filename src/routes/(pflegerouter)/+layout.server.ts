import type { LayoutServerLoad } from './$types';
import { requireUser } from '$lib/server/pflegerouter-access';
export const load: LayoutServerLoad = async ({ locals }) => ({ user: await requireUser(locals) });
