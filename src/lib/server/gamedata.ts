import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const DEFAULT_ROOTS = [
	'/data/violetproject/static/data',
	'/data/gamedata',
	path.resolve('static/data')
];

const ROOTS = process.env.GAMEDATA_ROOT
	? [path.resolve(process.env.GAMEDATA_ROOT)]
	: [...new Set(DEFAULT_ROOTS.map((root) => path.resolve(root)))];

const utf8 = new TextDecoder('utf-8', { fatal: true });
let cp1252: TextDecoder | null = null;
let sjis: TextDecoder | null = null;
try {
	cp1252 = new TextDecoder('windows-1252');
} catch {

}
try {
	sjis = new TextDecoder('shift_jis');
} catch {
	console.warn('[gamedata] Shift-JIS decoder unavailable; CP932 filenames cannot be resolved');
}

type GameFile = string | Buffer;

type Entry = {
	raw: Buffer;
	dir: boolean;
	names: Set<string>;
	lossy: string | null;
};

const dirCache = new Map<string, Entry[]>();
const fileCache = new Map<string, GameFile>();


const CP1252_BYTES: Record<number, number> = {
	0x20ac: 0x80,
	0x201a: 0x82,
	0x0192: 0x83,
	0x201e: 0x84,
	0x2026: 0x85,
	0x2020: 0x86,
	0x2021: 0x87,
	0x02c6: 0x88,
	0x2030: 0x89,
	0x0160: 0x8a,
	0x2039: 0x8b,
	0x0152: 0x8c,
	0x017d: 0x8e,
	0x2018: 0x91,
	0x2019: 0x92,
	0x201c: 0x93,
	0x201d: 0x94,
	0x2022: 0x95,
	0x2013: 0x96,
	0x2014: 0x97,
	0x02dc: 0x98,
	0x2122: 0x99,
	0x0161: 0x9a,
	0x203a: 0x9b,
	0x0153: 0x9c,
	0x017e: 0x9e,
	0x0178: 0x9f
};

function decode(raw: Buffer, decoder: TextDecoder | null): string | null {
	if (!decoder) return null;
	try {
		return decoder.decode(raw);
	} catch {
		return null;
	}
}

function addName(set: Set<string>, name: string | null) {
	if (!name) return;
	set.add(name);
	set.add(name.normalize('NFC'));
	set.add(name.normalize('NFD'));
}

function encodeLatin1(name: string): Buffer | null {
	for (let i = 0; i < name.length; i++) {
		if (name.charCodeAt(i) > 0xff) return null;
	}
	return Buffer.from(name, 'latin1');
}

function encodeCp1252(name: string): Buffer | null {
	const bytes: number[] = [];
	for (const ch of name) {
		const code = ch.codePointAt(0)!;
		if (code <= 0xff) {
			bytes.push(code);
			continue;
		}
		const mapped = CP1252_BYTES[code];
		if (mapped === undefined) return null;
		bytes.push(mapped);
	}
	return Buffer.from(bytes);
}

let cp932Encoder: Map<string, Buffer> | null = null;

function buildCp932Encoder(): Map<string, Buffer> | null {
	if (!sjis) return null;
	const map = new Map<string, Buffer>();
	const add = (bytes: Buffer) => {
		const text = decode(bytes, sjis);
		if (!text || text.includes('\uFFFD')) return;
		if ([...text].length !== 1) return;
		if (!map.has(text)) map.set(text, Buffer.from(bytes));
	};

	for (let byte = 0; byte <= 0x7f; byte++) add(Buffer.from([byte]));
	for (let byte = 0xa1; byte <= 0xdf; byte++) add(Buffer.from([byte]));
	for (let lead = 0x81; lead <= 0x9f; lead++) {
		for (let trail = 0x40; trail <= 0xfc; trail++) {
			if (trail !== 0x7f) add(Buffer.from([lead, trail]));
		}
	}
	for (let lead = 0xe0; lead <= 0xfc; lead++) {
		for (let trail = 0x40; trail <= 0xfc; trail++) {
			if (trail !== 0x7f) add(Buffer.from([lead, trail]));
		}
	}
	return map;
}

function encodeCp932(name: string): Buffer | null {
	if (!sjis) return null;
	if (/^[\x00-\x7f]*$/.test(name)) return Buffer.from(name, 'ascii');
	if (!cp932Encoder) cp932Encoder = buildCp932Encoder();
	if (!cp932Encoder) return null;

	const bytes: number[] = [];
	for (const ch of name) {
		const mapped = cp932Encoder.get(ch);
		if (!mapped) return null;
		for (const byte of mapped) bytes.push(byte);
	}
	return Buffer.from(bytes);
}

function addDecoded(set: Set<string>, raw: Buffer) {
	addName(set, decode(raw, utf8));
	addName(set, decode(raw, sjis));
	addName(set, decode(raw, cp1252));
}

function addNameVariants(set: Set<string>, name: string | null) {
	if (!name) return;
	addName(set, name);

	const latin = encodeLatin1(name);
	if (latin) addDecoded(set, latin);

	const windows = encodeCp1252(name);
	if (windows) addDecoded(set, windows);
}

function requestedNames(segment: string): Set<string> {
	const names = new Set<string>();
	addNameVariants(names, segment);
	return names;
}

function lossyPattern(segment: string): RegExp | null {
	if (!segment.includes('\uFFFD') && !segment.includes('?')) return null;
	let pattern = '^';
	for (const ch of segment) {
		if (ch === '\uFFFD' || ch === '?') {
			pattern += '.';
		} else {
			pattern += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}
	}
	return new RegExp(pattern + '$', 's');
}

async function readDirectory(dir: string | Buffer): Promise<Entry[]> {
	const key = typeof dir === 'string' ? 's:' + dir : 'b:' + dir.toString('hex');
	const cached = dirCache.get(key);
	if (cached) return cached;

	let entries: Entry[] = [];
	try {
		type RawDirent = { name?: Buffer | string; isDirectory?: () => boolean };
		let list: RawDirent[] | null = null;
		try {
			list = (await readdir(dir, {
				withFileTypes: true,
				encoding: 'buffer'
			})) as unknown as RawDirent[];
		} catch {
			list = null;
		}

		if (list && list.length > 0 && typeof list[0].name === 'undefined') {
			const pending = list.map(async (item): Promise<Entry | null> => {
				const value = item as unknown as Uint8Array | string;
				const raw = typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
				const asString = decode(raw, utf8);
				const full =
					typeof dir === 'string' && asString !== null
						? path.join(dir, asString)
						: joinBufferPath(Buffer.isBuffer(dir) ? dir : Buffer.from(dir), raw);
				try {
					const info = await stat(full);
					const names = new Set<string>();
					addNameVariants(names, asString);
					addNameVariants(names, decode(raw, sjis));
					addNameVariants(names, decode(raw, cp1252));
					return { raw, dir: info.isDirectory(), names, lossy: decode(raw, cp1252) };
				} catch {
					return null;
				}
			});
			entries = (await Promise.all(pending)).filter((entry): entry is Entry => entry !== null);
		} else if (list) {
			entries = list.map((item) => {
				const raw = Buffer.isBuffer(item.name) ? item.name : Buffer.from(item.name ?? '', 'utf8');
				const names = new Set<string>();
				addNameVariants(names, decode(raw, utf8));
				addNameVariants(names, decode(raw, sjis));
				addNameVariants(names, decode(raw, cp1252));
				return { raw, dir: item.isDirectory?.() ?? false, names, lossy: decode(raw, cp1252) };
			});
		}
	} catch {
		entries = [];
	}
	dirCache.set(key, entries);
	return entries;
}

function joinBufferPath(dir: Buffer, name: Buffer): Buffer {
	const sep = Buffer.from(path.sep);
	if (dir.length > 0 && dir[dir.length - 1] === sep[0]) return Buffer.concat([dir, name]);
	return Buffer.concat([dir, sep, name]);
}

function splitPath(rel: string): string[] | null {
	if (!rel || rel.includes('\0')) return null;
	const parts = rel.split('/');
	if (parts.some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) {
		return null;
	}
	return parts;
}

async function resolveInRoot(root: string, rel: string): Promise<GameFile | null> {
	const parts = splitPath(rel);
	if (!parts) return null;

	let currentString: string | null = root;
	let currentBuffer = Buffer.from(root);
	const prefix = root.endsWith(path.sep) ? root : root + path.sep;

	for (let index = 0; index < parts.length; index++) {
		const part = parts[index];
		if (!part) return null;
		const last = index === parts.length - 1;

		if (currentString) {
			const direct: string = path.join(currentString, part);
			if (direct.startsWith(prefix)) {
				try {
					const info = await stat(direct);
					if (info.isFile() || info.isDirectory()) {
						currentString = direct;
						currentBuffer = Buffer.from(direct);
						continue;
					}
				} catch {
				}
			}
		}

		const names = requestedNames(part);
		const pattern = lossyPattern(part);
		const entries = await readDirectory(currentString ?? currentBuffer);
		const find = (strictType: boolean) => {
			for (const entry of entries) {
				if (strictType && entry.dir === last) continue;
				for (const name of names) {
					if (entry.names.has(name)) return entry;
				}
			}
			return undefined;
		};
		const findLossy = (strictType: boolean) => {
			if (!pattern) return undefined;
			for (const entry of entries) {
				if (strictType && entry.dir === last) continue;
				if (entry.lossy && pattern.test(entry.lossy)) return entry;
				for (const name of entry.names) {
					const bytes = encodeCp932(name);
					if (!bytes) continue;
					const lossy = decode(bytes, cp1252);
					if (lossy && pattern.test(lossy)) return entry;
				}
			}
			return undefined;
		};

		const match = find(true) ?? find(false) ?? findLossy(true) ?? findLossy(false);
		if (!match) return null;
		if (currentString) {
			const decoded = decode(match.raw, utf8);
			if (decoded !== null) {
				currentString = path.join(currentString, decoded);
				currentBuffer = Buffer.from(currentString);
			} else {
				currentBuffer = joinBufferPath(currentBuffer, match.raw);
				currentString = null;
			}
		} else {
			currentBuffer = joinBufferPath(currentBuffer, match.raw);
		}
	}

	return currentString ?? currentBuffer;
}

export async function resolveGameDataPath(rel: string): Promise<GameFile | null> {
	const cached = fileCache.get(rel);
	if (cached) return cached;
	for (const root of ROOTS) {
		const file = await resolveInRoot(root, rel);
		if (file) {
			fileCache.set(rel, file);
			return file;
		}
	}
	return null;
}
