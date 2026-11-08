import { createAuth } from '../lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await createAuth().api.getSession({
		headers: request.headers
	});

	const raw = String(
		session?.user.displayUsername ?? session?.user.name ?? session?.user.username ?? ''
	);
	return {
		user: session?.user ?? null,
		displayName: raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 22)
	};
};
