import { error, json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '../../../../lib/server/db';
import {
	discordAllowed,
	handoffCodes,
	HANDOFF_TTL,
	hashToken,
	randomToken,
	readJson,
	SESSION_DAYS,
	T_SESSIONS
} from '../_guard';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await readJson(request);
	const code = String(body.code || '').trim();
	if (!code) throw error(400, 'no code');
	const rec = handoffCodes.get(code);
	handoffCodes.delete(code);
	if (!rec) throw error(401, 'bad or already used code');
	if (Date.now() - rec.at > HANDOFF_TTL) throw error(401, 'code expired, log in again');
	if (!discordAllowed(rec.discordId)) throw error(403, 'discord id not allowed');
	const token = randomToken(32);
	const tokenHash = hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	try {
		await db.execute(
			sql`INSERT INTO ${T_SESSIONS} (tokenHash, discordId, discordName, locked, expiresAt) VALUES (${tokenHash}, ${rec.discordId}, ${rec.name}, 1, ${expiresAt})`
		);
	} catch {
		throw error(503, 'desktopSessions table missing or outdated');
	}
	db.execute(sql`DELETE FROM ${T_SESSIONS} WHERE expiresAt < NOW()`).catch(() => {});
	console.log(`[desktop] session created for ${rec.name} (${rec.discordId})`);
	return json({ token, name: rec.name });
};
