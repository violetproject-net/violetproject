import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const BOOTED_AT = Date.now();

export const GET: RequestHandler = async () => {
	return json(
		{ v: env.APP_VERSION ?? String(BOOTED_AT) },
		{ headers: { 'cache-control': 'no-store' } }
	);
};
