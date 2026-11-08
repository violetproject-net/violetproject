import { createAuth } from '../lib/server/auth';
import { getTodayFeatured } from '../lib/server/featured';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
    const session = await createAuth().api.getSession({
        headers: request.headers
    });
    const featured = getTodayFeatured();

    return {
        displayName: session?.user.name ?? session?.user.displayUsername ?? session?.user.username ?? null,
        featured: { slug: featured.slug, name: featured.name }
    };
};
