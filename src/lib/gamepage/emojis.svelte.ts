export type Emoji = { 
    name: string; 
    url: string;
};

class EmojiStore {
	emojis = $state<Emoji[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	#loadPromise: Promise<void> | null = null;

	ensure(): Promise<void> {
		if (this.emojis.length) 
            return Promise.resolve();

		this.#loadPromise ??= this.#load().finally(() => (this.#loadPromise = null));
		return this.#loadPromise;
	}

	async #load() {
		this.loading = true;
		this.error = null;
		try {
			const res = await fetch('/img/emoji/index.json');
			if (!res.ok) 
                throw new Error(`couldn't fetch emoji index: ${res.status}`);
            
			const files: string[] = await res.json();
			this.emojis = files.map((file) => {
				return {
					name: file.replace(/\.[^.]+$/, ''),
					url: `/img/emoji/${file}`
				};
			});
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
			console.log('[violetproject] Failed to load emoji index', e);
		} finally {
			this.loading = false;
		}
	}

	refresh() {
		this.emojis = [];
		return this.ensure();
	}
}

export const emojiStore = new EmojiStore();
