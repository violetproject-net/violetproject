import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveGameDataPath } from '../../../lib/server/gamedata';

const TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.bmp': 'image/bmp',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.mid': 'audio/midi',
	'.midi': 'audio/midi',
	'.json': 'application/json'
};

const PREFIX = '/data/';

function decodePart(value: string): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
}

export async function GET({ params, url }: { params: { path: string }; url: URL }) {
	const candidates: string[] = [];
	const add = (value: string | null | undefined) => {
		if (value && !candidates.includes(value)) candidates.push(value);
	};

	add(params.path);

	if (url.pathname.startsWith(PREFIX)) {
		const raw = url.pathname.slice(PREFIX.length);
		const decoded = decodePart(raw);
		add(decoded);

		if (url.search.length > 1) {
			const query = decodePart(url.search.slice(1)) ?? url.search.slice(1);
			add(decoded ? `${decoded}?${query}` : null);
			add(`${params.path}?${query}`);
		}
	}

	let rel = candidates[0] ?? params.path;
	let file: Awaited<ReturnType<typeof resolveGameDataPath>> = null;
	for (const candidate of candidates) {
		file = await resolveGameDataPath(candidate);
		if (file) {
			rel = candidate;
			break;
		}
	}

	if (!file) {
		const debug = {
			pathname: url.pathname,
			search: url.search,
			params: params.path,
			candidates
		};
		console.warn('[gamedata] miss', JSON.stringify(debug));
		return new Response(JSON.stringify({ error: 'gamedata miss', ...debug }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		});
	}

	const resolved = Buffer.isBuffer(file) ? `buffer:${file.toString('hex')}` : file;

	try {
		const data = await readFile(file);
		const ext = path.extname(rel).toLowerCase();
		return new Response(new Uint8Array(data), {
			headers: {
				'Content-Type': TYPES[ext] ?? 'application/octet-stream',
				'Cache-Control': 'public, max-age=86400',
				'X-Gamedata': 'hit'
			}
		});
	} catch (err) {
		const debug = {
			pathname: url.pathname,
			search: url.search,
			params: params.path,
			rel,
			resolved,
			error: String(err)
		};
		console.warn('[gamedata] read failed', JSON.stringify(debug));
		return new Response(JSON.stringify({ ...debug, stage: 'read failed' }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		});
	}
}
