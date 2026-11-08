import { error } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { createAuth } from '../../../lib/server/auth';
import { db } from '../../../lib/server/db';
import type { RequestHandler } from './$types';

async function requireUserId(request: Request) {
	const session = await createAuth().api.getSession({ headers: request.headers });
	const uid = (session?.user as { id?: unknown } | null)?.id;
	if (!uid) throw error(401, 'login required');
	return String(uid);
}

export const GET: RequestHandler = async ({ request, url }) => {
	await requireUserId(request);
	const id = Math.floor(Number(url.searchParams.get('id')));
	if (!Number.isFinite(id) || id < 1) throw error(400, 'bad id');
	const res = (await db.execute(
		sql`SELECT img FROM screenshots WHERE id = ${id} LIMIT 1`
	)) as unknown as Array<{ img: Uint8Array }> | { rows?: Array<{ img: Uint8Array }> };
	let list: Array<{ img?: Uint8Array }> = [];
	if (Array.isArray(res)) list = Array.isArray(res[0]) ? (res[0] as Array<{ img?: Uint8Array }>) : (res as Array<{ img?: Uint8Array }>);
	else list = res?.rows ?? [];
	const img = list[0]?.img;
	console.log(`[shots] id=${id} rows=${list.length} bytes=${(img as Uint8Array)?.length ?? 0}`);
	if (!img) throw error(404, 'no shot');
	const buf = Buffer.from(img);
	const png = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
	const webp =
		buf.length >= 12 &&
		buf.toString('ascii', 0, 4) === 'RIFF' &&
		buf.toString('ascii', 8, 12) === 'WEBP';
	return new Response(buf, {
		headers: {
			'Content-Type': png ? 'image/png' : webp ? 'image/webp' : 'application/octet-stream',
			'cache-control': 'public, max-age=86400'
		}
	});
};
