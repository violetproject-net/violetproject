import { error } from '@sveltejs/kit';
const env = process.env;
import { pendingStates, randomToken } from '../../_guard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const clientId = String(env.YNO_DESKTOP_DISCORD_CLIENT_ID || '').trim();
	if (!clientId) throw error(503, 'desktop login not configured: set YNO_DESKTOP_DISCORD_CLIENT_ID');
	const state = randomToken(16);
	if (pendingStates.size > 500) pendingStates.clear();
	pendingStates.set(state, Date.now());
	const base =
		String(env.YNO_DESKTOP_PUBLIC_URL || '')
			.trim()
			.replace(/\/+$/, '') || url.origin;
	const params = new URLSearchParams({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: `${base}/api/desktop/discord/callback`,
		scope: 'identify',
		state,
		prompt: 'consent'
	});
	return new Response(null, {
		status: 302,
		headers: { location: `https://discord.com/oauth2/authorize?${params.toString()}` }
	});
};
