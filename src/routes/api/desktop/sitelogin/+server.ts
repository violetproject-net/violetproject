import { error, json } from '@sveltejs/kit';
import { sql, type SQL } from 'drizzle-orm';
import { promisify } from 'node:util';
import { scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
const env = process.env;
import { db } from '../../../../lib/server/db';
import {
	acctCols,
	attemptsBlocked,
	attemptsNote,
	col,
	readJson,
	requireDesktop,
	rows,
	T_SESSIONS,
	T_USER,
	userCols
} from '../_guard';
import type { RequestHandler } from './$types';

const scrypt = promisify(scryptCb);
const SCRYPT_OPTS = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 };

async function relayIsAdmin(uid: string, name: string, display: string) {
	const secret = String(env.YNO_DESKTOP_INTERNAL_SECRET || '');
	if (!secret) throw error(503, 'YNO_DESKTOP_INTERNAL_SECRET not set');
	const base = String(env.YNO_RELAY_HTTP || 'http://127.0.0.1:8002').replace(/\/+$/, '');
	let res: Response;
	try {
		res = await fetch(base + '/desktop/isadmin', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-yno-internal': secret },
			body: JSON.stringify({ uid, name, display }),
			signal: AbortSignal.timeout(10000)
		});
	} catch {
		throw error(502, 'cannot verify admin account');
	}
	const out = (await res.json().catch(() => null)) as { ok?: boolean; admin?: boolean } | null;
	if (!out) throw error(502, 'relay bad response');
	return Boolean(out.ok && out.admin);
}

export const POST: RequestHandler = async ({ request }) => {
	const s = await requireDesktop(request);
	const key = 'site:' + s.discordId;
	if (attemptsBlocked(key)) throw error(429, 'too many attempts');
	const body = await readJson(request);
	const ident = String(body.username || '').trim().slice(0, 190);
	const pass = String(body.password || '');
	if (!ident || !pass) throw error(400, 'username and password required');

	const bad = () => {
		attemptsNote(key, false);
		console.log(`[desktop] site login failed for ${s.discordName} (${s.discordId}) ident="${ident}"`);
		return error(401, 'invalid username or password');
	};

	const u = await userCols();
	const conds: SQL[] = [sql`${col(u.id)} = ${ident}`];
	if (u.name) conds.push(sql`${col(u.name)} = ${ident}`);
	if (u.display) conds.push(sql`${col(u.display)} = ${ident}`);
	if (u.email) conds.push(sql`${col(u.email)} = ${ident}`);
	const fields: SQL[] = [sql`${col(u.id)} AS id`];
	fields.push(u.name ? sql`${col(u.name)} AS name` : sql`'' AS name`);
	fields.push(u.display ? sql`${col(u.display)} AS display` : sql`'' AS display`);
	let found: Record<string, unknown> | undefined;
	try {
		const res = await db.execute(
			sql`SELECT ${sql.join(fields, sql`, `)} FROM ${T_USER} WHERE ${sql.join(conds, sql` OR `)} LIMIT 1`
		);
		found = rows(res)[0];
	} catch {
		throw error(503, 'user table query failed');
	}
	if (!found) throw bad();
	const uid = String(found.id || '');
	const uname = String(found.name || ident);
	const udisplay = String(found.display || '');

	const a = await acctCols();
	if (!a.user || !a.password) throw error(503, 'account table not found');
	const aConds: SQL[] = [sql`${col(a.user)} = ${uid}`];
	if (a.provider) aConds.push(sql`${col(a.provider)} = ${'credential'}`);
	let stored = '';
	try {
		const res = await db.execute(
			sql`SELECT ${col(a.password)} AS pw FROM ${sql.raw('`' + a.table + '`')} WHERE ${sql.join(aConds, sql` AND `)} LIMIT 1`
		);
		stored = String(rows(res)[0]?.pw || '');
	} catch {
		throw error(503, 'account table query failed');
	}
	if (!stored) throw bad();

	const idx = stored.indexOf(':');
	let ok = false;
	try {
		if (idx > 0) {
			const salt = stored.slice(0, idx);
			const want = stored.slice(idx + 1);
			const got = (
				(await scrypt(pass.normalize('NFKC'), salt, 64, SCRYPT_OPTS)) as Buffer
			).toString('hex');
			if (want && got.length === want.length) {
				ok = timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(want, 'hex'));
			}
		}
	} catch {
		ok = false;
	}
	if (!ok) throw bad();

	const admin = await relayIsAdmin(uid, uname, udisplay);
	if (!admin) {
		attemptsNote(key, false);
		console.log(`[desktop] site login denied for ${s.discordName} as ${uname}`);
		throw error(403, 'that account is not an admin');
	}

	attemptsNote(key, true);
	await db.execute(
		sql`UPDATE ${T_SESSIONS} SET siteVerified = 1, siteUserId = ${uid}, siteUserName = ${uname} WHERE tokenHash = ${s.tokenHash}`
	);
	console.log(`[desktop] site login ok for ${s.discordName} as ${uname}`);
	return json({ ok: true, name: uname });
};
