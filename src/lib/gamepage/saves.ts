export const MAX_SLOT = 3;

const saveFileName = (slot: number) => `Save${String(slot).padStart(2, '0')}.lsd`;

type SaveHost = {
	game: string;
	engine: () => any;
	displayName: () => string;
};

export type SaveBlob = { slot: number; buf: Uint8Array };

export function createCloudSaves(host: SaveHost) {
	async function downloadSlot(slot: number): Promise<Uint8Array | null> {
		if (!host.displayName()) return null;
		try {
			const r = await fetch(`/api/saves?game=${host.game}&slot=${slot}`, {
				credentials: 'same-origin'
			});
			if (!r.ok) return null;
			const buf = new Uint8Array(await r.arrayBuffer());
			return buf.length ? buf : null;
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	async function downloadAll(): Promise<SaveBlob[]> {
		if (!host.displayName()) {
			console.log('[save] guest mode, local saves only');
			return [];
		}
		const out: SaveBlob[] = [];
		try {
			const r = await fetch(`/api/saves?game=${host.game}`, { credentials: 'same-origin' });
			if (!r.ok) return out;
			const slots = ((await r.json()).slots ?? []).filter(
				(s: unknown) => Number.isFinite(s) && (s as number) >= 1 && (s as number) <= MAX_SLOT
			);
			await Promise.all(
				slots.map(async (slot: number) => {
					const buf = await downloadSlot(slot);
					if (buf) out.push({ slot, buf });
				})
			);
		} catch (e) {
			console.warn(e);
		}
		return out;
	}

	function install(slot: number, buf: Uint8Array | null) {
		const engine = host.engine();
		if (!buf || !engine) return false;
		try {
			const paths = [`/easyrpg/${host.game}/Save/${saveFileName(slot)}`, `Save/${saveFileName(slot)}`];
			try {
				engine.FS.mkdirTree(`/easyrpg/${host.game}/Save`);
			} catch {}
			let okBytes = -1;
			for (const p of paths) {
				try {
					engine.FS.writeFile(p, buf);
					okBytes = engine.FS.readFile(p).length;
				} catch {}
			}
			console.log(`[save] installed slot ${slot}: ${buf.length} bytes (readback ${okBytes})`);
			try {
				engine.FS.syncfs(() => {});
			} catch {}
			try {
				console.log(`[save] Save dir: ${engine.FS.readdir(`/easyrpg/${host.game}/Save`).join(',')}`);
			} catch (e) {
				console.log('[save] Save dir missing');
			}
			try {
				engine.api?.refreshScene?.();
			} catch {}
			return okBytes === buf.length;
		} catch (e) {
			console.warn('[save] install failed:', e);
			return false;
		}
	}

	function upload(slot: number) {
		const engine = host.engine();
		if (!Number.isFinite(slot) || slot < 1 || slot > MAX_SLOT || !host.displayName() || !engine) return;
		void (async () => {
			try {
				const data = engine.FS.readFile(`Save/${saveFileName(slot)}`);
				const r = await fetch(`/api/saves?game=${host.game}&slot=${slot}`, {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/octet-stream' },
					body: data
				});
				if (!r.ok) console.warn('save upload', r.status);
				else console.log(`[save] uploaded slot ${slot}: ${data.length} bytes`);
			} catch (e) {
				console.warn(e);
			}
		})();
	}

	return { downloadAll, install, upload };
}
