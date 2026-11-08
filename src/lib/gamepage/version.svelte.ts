export class VersionWatcher {
	updateReady = $state(false);
	serverVersion: string | null = $state(null);
	private timer: ReturnType<typeof setInterval> | null = null;

	async check() {
		try {
			const r = await fetch('/api/version', { cache: 'no-store' });
			if (!r.ok) 
				return;
			const v = String((await r.json()).v ?? '');
			if (!this.serverVersion) {
				this.serverVersion = v;
			} else if (v && v !== this.serverVersion) {
				this.updateReady = true;
			}
		} catch {}
	}

	start() {
		void this.check();
		if (!this.timer) {
			this.timer = setInterval(() => {
				void this.check();
			}, 60000);
		}
	}

	stop() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}
}
