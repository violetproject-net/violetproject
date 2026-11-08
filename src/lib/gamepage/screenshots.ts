import { shotFileTs } from './format';
import type { Shot } from './types';

const clean = (v: string | undefined) =>
	String(v || '')
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 40) || 'unknown';

export async function downloadScreenshot(src: string, shot: Shot | undefined, scale: number) {
	try {
		const res = await fetch(src);
		const blob = await res.blob();
		if (!blob || !blob.size) return;
		let final: Blob = blob;
		try {
			const bmp = await createImageBitmap(blob);
			const out = document.createElement('canvas');
			out.width = bmp.width * scale;
			out.height = bmp.height * scale;
			const ctx = out.getContext('2d');
			if (ctx) {
				ctx.imageSmoothingEnabled = false;
				ctx.drawImage(bmp, 0, 0, out.width, out.height);
				const png: Blob | null = await new Promise((r) => out.toBlob(r, 'image/png'));
				if (png) final = png;
			}
		} catch {}
		const game = clean(shot?.game);
		const loc = clean(shot?.map || (shot?.room ? `Map ${shot.room}` : 'unknown'));
		const url = URL.createObjectURL(final);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${game}_${loc}_screenshot_${shotFileTs(shot?.ts || Date.now())}.png`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} catch {}
}
