import type { PageServerLoad } from './$types';
import { getOrganizationContext, getRepresentedRecipients, getSelfRecipients, requireUser } from '$lib/server/pflegerouter-access';
export const load: PageServerLoad = async ({ locals, cookies }) => {
  const user = await requireUser(locals);
  const [self, other, organization] = await Promise.all([
    getSelfRecipients(user.id), getRepresentedRecipients(user.id), getOrganizationContext(user, cookies)
  ]);
  return { selfCount: self.length, otherCount: other.length,
    organization: organization.active?.organizationName ?? null,
    organizationView: organization.operation?.kind === 'BUSINESS' ? 'business' :
      organization.operation?.kind === 'VOLUNTEER_ORG' ? 'volunteer' : null };
};
