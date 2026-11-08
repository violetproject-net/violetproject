import { json } from '@sveltejs/kit';
import { requireDesktop } from '../_guard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const s = await requireDesktop(request);
	return json({
		ok: true,
		name: s.discordName,
		discordId: s.discordId,
		locked: s.locked,
		siteVerified: s.siteVerified
	});
};
