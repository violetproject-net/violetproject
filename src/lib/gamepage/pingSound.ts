export class PingPlayer {
	private audio: HTMLAudioElement | null = null;

	play(opts: { muted: boolean; sound: string; volume: number }) {
		if (opts.muted || !opts.sound) return;

		try {
			if (!this.audio) this.audio = new Audio();

			this.audio.pause();
			this.audio.src = `/sounds/ping/${opts.sound}`;
			this.audio.volume = Math.min(1, Math.max(0, opts.volume / 100));

			void this.audio.play().catch(() => {});
		} catch {}
	}

	unlock = () => {};

	dispose() {
		try {
			if (this.audio) {
				this.audio.pause();
				this.audio.removeAttribute('src');
				this.audio.load();
				this.audio = null;
			}
		} catch {}
	}
}