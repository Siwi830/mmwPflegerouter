// import { error } from '@sveltejs/kit';
// import { eq, desc } from 'drizzle-orm';
// import { z } from 'zod';
// import { db } from '$lib/server/db/client';
// import { projects } from '$lib/server/db/schema';
// export const projectSchema = z.object({name:z.string().trim().min(2).max(150),description:z.string().max(2000)});
// export const projectService = {
//   list(user:App.Locals['user']) {
//     if (!user) error(401,'Nicht angemeldet');
//     return db.select().from(projects).where(eq(projects.ownerId,user.id)).orderBy(desc(projects.createdAt));
//   },
//   create(user:App.Locals['user'],input:unknown) {
//     if (!user) error(401,'Nicht angemeldet');
//     const data = projectSchema.parse(input);
//     return db.insert(projects).values({...data,ownerId:user.id}).returning();
//   }
// };
