import { error, json } from '@sveltejs/kit';
const env = process.env;
import { readJson, requireDesktop } from '../_guard';
import type { RequestHandler } from './$types';

const ALLOWED = new Set(['mute', 'unmute', 'ban', 'unban', 'rename', 'delete', 'resetpw']);

function relayBase() {
	return String(env.YNO_RELAY_HTTP || 'http://127.0.0.1:8002').replace(/\/+$/, '');
}

export const POST: RequestHandler = async ({ request }) => {
	const s = await requireDesktop(request, { unlocked: true });
	const body = await readJson(request);
	const action = String(body.action || '');
	if (!ALLOWED.has(action)) throw error(400, 'unknown action');
	const secret = String(env.YNO_DESKTOP_INTERNAL_SECRET || '');
	if (!secret) throw error(503, 'YNO_DESKTOP_INTERNAL_SECRET not set');
	const payload = {
		action,
		target: String(body.target || '').slice(0, 22),
		minutes: Math.max(0, Math.floor(Number(body.minutes) || 0)),
		reason: String(body.reason || '').slice(0, 200),
		newName: String(body.newName || '').slice(0, 22),
		confirm: String(body.confirm || '').slice(0, 22),
		by: s.discordName || 'Desktop'
	};
	console.log(`[desktop] action=${action} target=${payload.target} by=${s.discordName}`);
	let res: Response;
	try {
		res = await fetch(relayBase() + '/desktop/action', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-yno-internal': secret },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(15000)
		});
	} catch {
		throw error(502, 'relay unreachable');
	}
	const out = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
	if (!out) throw error(502, 'relay bad response');
	return json({ ok: Boolean(out.ok), message: String(out.message || '') });
};
