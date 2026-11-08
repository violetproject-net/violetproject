import { createAuth } from '../../lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const session = await createAuth().api.getSession({
		headers: request.headers
	});

	const raw = String(
		session?.user.displayUsername ?? session?.user.name ?? session?.user.username ?? ''
	);
	return {
		displayName: raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
	};
};
