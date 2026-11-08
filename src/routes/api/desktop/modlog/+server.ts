import { error, json } from '@sveltejs/kit';
const env = process.env;
import { requireDesktop } from '../_guard';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTION_RE = /^[a-z]{2,16}$/;

export const GET: RequestHandler = async ({ request, url }) => {
	await requireDesktop(request, { unlocked: true });
	const from = String(url.searchParams.get('from') || '').trim();
	const to = String(url.searchParams.get('to') || '').trim();
	const action = String(url.searchParams.get('action') || '')
		.trim()
		.toLowerCase();
	if (from && !DATE_RE.test(from)) throw error(400, 'bad from date');
	if (to && !DATE_RE.test(to)) throw error(400, 'bad to date');
	if (action && !ACTION_RE.test(action)) throw error(400, 'bad action');
	const secret = String(env.YNO_DESKTOP_INTERNAL_SECRET || '');
	if (!secret) throw error(503, 'YNO_DESKTOP_INTERNAL_SECRET not set');
	const base = String(env.YNO_RELAY_HTTP || 'http://127.0.0.1:8002').replace(/\/+$/, '');
	const payload = {
		from,
		to,
		action,
		target: String(url.searchParams.get('target') || '')
			.trim()
			.slice(0, 22),
		limit: Math.min(250, Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 0)) || 100))
	};
	let res: Response;
	try {
		res = await fetch(base + '/desktop/modlog', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-yno-internal': secret },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(15000)
		});
	} catch {
		throw error(502, 'relay unreachable');
	}
	const out = (await res.json().catch(() => null)) as
		| { ok?: boolean; message?: string; rows?: unknown[]; total?: number }
		| null;
	if (!out) throw error(502, 'relay bad response');
	if (!out.ok) throw error(400, String(out.message || 'error'));
	return json({ rows: out.rows || [], total: Number(out.total) || 0, limit: payload.limit });
};
