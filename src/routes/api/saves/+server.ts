import { error, json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { createAuth } from '../../../lib/server/auth';
import { db } from '../../../lib/server/db';
import type { RequestHandler } from './$types';

const MAX_SLOT = 3;
const MAX_SAVE_BYTES = 1024 * 1024;

const cleanGame = (v: string) =>
	String(v || '')
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '')
		.slice(0, 32);

type Row = Record<string, unknown>;

function rows(res: unknown): Row[] {
	if (Array.isArray(res)) {
		const first = res[0];
		if (Array.isArray(first)) return first as Row[];
		return res as Row[];
	}
	const maybe = res as { rows?: Row[] } | null;
	return maybe && Array.isArray(maybe.rows) ? maybe.rows : [];
}

async function dbRun<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		const msg = String((e as Error)?.message || e);
		console.error('[saves] db error:', msg);
		throw error(503, 'gameSaves query failed (' + msg + ')');
	}
}

async function requireUserId(request: Request) {
	const session = await createAuth().api.getSession({ headers: request.headers });
	const uid = (session?.user as { id?: unknown } | null)?.id;
	if (!uid) throw error(401, 'login required');
	return String(uid);
}

function parseSlot(url: URL) {
	const s = Math.floor(Number(url.searchParams.get('slot') || 1));
	if (!Number.isFinite(s) || s < 1 || s > MAX_SLOT) throw error(400, 'bad slot');
	return s;
}

export const GET: RequestHandler = async ({ request, url }) => {
	const uid = await requireUserId(request);
	const game = cleanGame(url.searchParams.get('game') || '');
	if (!game) throw error(400, 'bad game');
	if (url.searchParams.get('slot') === null) {
		const res = await dbRun(() =>
			db.execute(sql`SELECT slot FROM gameSaves WHERE uuid = ${uid} AND game = ${game}`)
		);
		const slots = rows(res)
			.map((r) => Math.floor(Number(r.slot)))
			.filter((s) => Number.isFinite(s) && s >= 1 && s <= MAX_SLOT);
		console.log(`[saves] list game=${game} slots=${slots.join(',') || 'none'}`);
		return json({ slots });
	}
	const slot = parseSlot(url);
	const res = await dbRun(() =>
		db.execute(
			sql`SELECT data FROM gameSaves WHERE uuid = ${uid} AND game = ${game} AND slot = ${slot} LIMIT 1`
		)
	);
	const data = rows(res)[0]?.data;
	if (!data) throw error(404, 'no save');
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
	console.log(`[saves] get game=${game} slot=${slot} bytes=${buf.length}`);
	return new Response(buf, {
		headers: { 'Content-Type': 'application/octet-stream', 'cache-control': 'no-store' }
	});
};

export const POST: RequestHandler = async ({ request, url }) => {
	const uid = await requireUserId(request);
	const game = cleanGame(url.searchParams.get('game') || '');
	if (!game) throw error(400, 'bad game');
	const slot = parseSlot(url);
	const buf = Buffer.from(await request.arrayBuffer());
	if (!buf.length || buf.length > MAX_SAVE_BYTES) throw error(400, 'bad save');
	await dbRun(() =>
		db.execute(
			sql`INSERT INTO gameSaves (uuid, game, slot, data) VALUES (${uid}, ${game}, ${slot}, ${buf})
				ON DUPLICATE KEY UPDATE data = VALUES(data)`
		)
	);
	console.log(`[saves] put game=${game} slot=${slot} bytes=${buf.length}`);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, url }) => {
	const uid = await requireUserId(request);
	const game = cleanGame(url.searchParams.get('game') || '');
	if (!game) throw error(400, 'bad game');
	const slot = parseSlot(url);
	await dbRun(() =>
		db.execute(sql`DELETE FROM gameSaves WHERE uuid = ${uid} AND game = ${game} AND slot = ${slot}`)
	);
	console.log(`[saves] delete game=${game} slot=${slot}`);
	return json({ ok: true });
};
