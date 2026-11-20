import { fail } from '@sveltejs/kit';
import type { Actions,PageServerLoad } from './$types';
import { projectService,projectSchema } from '$lib/server/modules/projects/project.service';
export const load:PageServerLoad = async ({locals}) => ({projects:await projectService.list(locals.user)});
export const actions:Actions = {create:async ({request,locals}) => {
  if (!locals.user) return fail(401,{message:'Nicht angemeldet'});
  const form = await request.formData();
  const result = projectSchema.safeParse({name:form.get('name'),description:form.get('description') ?? ''});
  if (!result.success) return fail(400,{message:'Ungültige Projektdaten'});
  await projectService.create(locals.user,result.data);
  return {success:true};
}};
