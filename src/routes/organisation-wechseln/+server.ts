import {
  error,
  redirect,
  type RequestHandler
} from '@sveltejs/kit';

import {
  getUserOrganizations,
  TENANT_COOKIE
} from '$lib/server/tenant';

export const POST: RequestHandler = async ({
  locals,
  request,
  cookies
}) => {
  const user = locals.user;

  if (!user) {
    redirect(303, '/login');
  }

  const form = await request.formData();
  const organizationId = form.get('organizationId');

  if (typeof organizationId !== 'string') {
    error(400, 'Ungültige Organisation.');
  }

  const organizations =
    await getUserOrganizations(user.id);

  const membership = organizations.find(
    (item) => item.organizationId === organizationId
  );

  if (!membership) {
    error(403, 'Kein Zugriff auf diese Organisation.');
  }

  cookies.set(TENANT_COOKIE, membership.organizationId, {
    path: '/',
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  });

  redirect(303, '/dashboard');
};