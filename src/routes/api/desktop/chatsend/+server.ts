import { error, json } from '@sveltejs/kit';
const env = process.env;
import { readJson, requireDesktop } from '../_guard';
import type { RequestHandler } from './$types';

const GAME_RE = /^([a-z0-9_-]{1,32}|site)$/;

export const POST: RequestHandler = async ({ request }) => {
	const s = await requireDesktop(request, { unlocked: true });
	const body = await readJson(request);
	const game = String(body.game || '')
		.trim()
		.toLowerCase();
	if (!GAME_RE.test(game)) throw error(400, 'bad game');
	const text = String(body.text || '').slice(0, 280).trim();
	if (!text) throw error(400, 'empty message');
	if (!s.siteUid) throw error(403, 'site login required');
	const secret = String(env.YNO_DESKTOP_INTERNAL_SECRET || '');
	if (!secret) throw error(503, 'YNO_DESKTOP_INTERNAL_SECRET not set');
	const base = String(env.YNO_RELAY_HTTP || 'http://127.0.0.1:8002').replace(/\/+$/, '');
	const announce = Boolean(body.announce);
	let res: Response;
	try {
		res = await fetch(base + '/desktop/chatsend', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-yno-internal': secret },
			body: JSON.stringify({
				game,
				text,
				announce,
				uid: s.siteUid,
				name: s.siteName,
				display: s.siteName,
				by: s.discordName || 'Desktop'
			}),
			signal: AbortSignal.timeout(10000)
		});
	} catch {
		throw error(502, 'relay unreachable');
	}
	const out = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
	if (!out) throw error(502, 'relay bad response');
	if (!out.ok) throw error(400, String(out.message || 'error'));
	console.log(
		`[desktop] chat send game=${game}${announce ? ' (announcement)' : ''} by=${s.siteName}`
	);
	return json({ ok: true, message: String(out.message || 'sent') });
};
