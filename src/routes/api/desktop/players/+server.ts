import { error, json } from '@sveltejs/kit';
const env = process.env;
import { requireDesktop } from '../_guard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	await requireDesktop(request, { unlocked: true });
	const secret = String(env.YNO_DESKTOP_INTERNAL_SECRET || '');
	if (!secret) throw error(503, 'YNO_DESKTOP_INTERNAL_SECRET not set');
	const base = String(env.YNO_RELAY_HTTP || 'http://127.0.0.1:8002').replace(/\/+$/, '');
	let res: Response;
	try {
		res = await fetch(base + '/desktop/players', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-yno-internal': secret },
			body: '{}',
			signal: AbortSignal.timeout(10000)
		});
	} catch {
		throw error(502, 'relay unreachable');
	}
	const out = (await res.json().catch(() => null)) as
		| { ok?: boolean; message?: string; rows?: unknown[]; total?: number }
		| null;
	if (!out) throw error(502, 'relay bad response');
	if (!out.ok) throw error(400, String(out.message || 'error'));
	return json({ rows: out.rows || [], total: Number(out.total) || 0 });
};
