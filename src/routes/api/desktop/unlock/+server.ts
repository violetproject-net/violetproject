import { error, json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
const env = process.env;
import { db } from '../../../../lib/server/db';
import {
	attemptsBlocked,
	attemptsNote,
	readJson,
	requireDesktop,
	safeEqual,
	T_SESSIONS
} from '../_guard';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const s = await requireDesktop(request);
	if (attemptsBlocked('unlock:' + s.discordId)) throw error(429, 'too many attempts');
	const body = await readJson(request);
	const pass = String(body.password || '');
	const want = String(env.YNO_DESKTOP_PASSWORD || '');
	if (!want) throw error(503, 'no password configured');
	const okPass = pass.length > 0 && safeEqual(pass, want);
	attemptsNote('unlock:' + s.discordId, okPass);
	if (!okPass) {
		console.log(`[desktop] wrong password for ${s.discordName} (${s.discordId})`);
		throw error(401, 'wrong password');
	}
	await db.execute(sql`UPDATE ${T_SESSIONS} SET locked = 0, lastSeenAt = NOW() WHERE tokenHash = ${s.tokenHash}`);
	console.log(`[desktop] unlocked for ${s.discordName}`);
	return json({ ok: true, name: s.discordName });
};
