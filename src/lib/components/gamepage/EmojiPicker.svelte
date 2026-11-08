<script lang="ts">
    import { fade } from 'svelte/transition';
	import { emojiStore, type Emoji } from '#lib/gamepage/emojis.svelte.ts';

	let {
		query = "",
		anchor = null,
		onPick
	}: {
		query: string | null;
		anchor?: HTMLElement | null;
		onPick: (name: string) => void;
	} = $props();

	const GAP = 8;

	let filteredEmojis = $derived.by(() => {
		if (!query) {
			return emojiStore.emojis;
		}
		const q = query.toLowerCase();
		if (!q) 
			return emojiStore.emojis;

		return emojiStore.emojis
			.filter((emoji) => emoji.name.toLowerCase().includes(q))
			.sort((a, b) =>
				Number(b.name.toLowerCase().startsWith(q)) -
				Number(a.name.toLowerCase().startsWith(q))
			);
	});
	
	let menu: HTMLDivElement | null = $state(null);
	let left = $state(-9999);
	let top = $state(-9999);
	let placed = $state(false);

	export function getEmojiQuery(): Emoji[] {
		return filteredEmojis;
	}

	function place() {
		if (!anchor || !menu) return;
		const box = anchor.getBoundingClientRect();
		const width = menu.offsetWidth;
		const height = menu.offsetHeight;

		let x = box.left;
		let y = box.top - height - GAP;
		if (y < GAP) y = box.bottom + GAP;
		x = Math.max(GAP, Math.min(x, window.innerWidth - width - GAP));
		y = Math.max(GAP, Math.min(y, window.innerHeight - height - GAP));

		left = x;
		top = y;
		placed = true;
	}

	$effect(() => {
		if (!anchor || !menu) return;
		place();

		const observer = new ResizeObserver(place);
		observer.observe(menu);
		observer.observe(anchor);
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
		};
	});

	$effect(() => {
		if (!menu) return;

		const COLS = 4;

		function onKey(event: KeyboardEvent) {
			if (!menu) return;
			const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>('button'));
			if (!buttons.length) return;

			const active = document.activeElement;
			const index = buttons.indexOf(active as HTMLButtonElement);
			
			if(index === -1 && event.key === 'Enter' && filteredEmojis !== emojiStore.emojis && filteredEmojis[0]) {
				onPick(filteredEmojis[0].name);
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			if (event.key === 'Tab') {
				if (active === anchor) {
					event.preventDefault();
					event.stopPropagation();
					(event.shiftKey ? buttons[buttons.length - 1] : buttons[0]).focus();
				} else if (index !== -1) {
					event.preventDefault();
					event.stopPropagation();
					const step = event.shiftKey ? -1 : 1;
					buttons[(index + step + buttons.length) % buttons.length].focus();
				}
				return;
			}

			if (index === -1) return;

			let next = index;
			if (event.key === 'ArrowRight') next = Math.min(index + 1, buttons.length - 1);
			else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0);
			else if (event.key === 'ArrowDown') next = Math.min(index + COLS, buttons.length - 1);
			else if (event.key === 'ArrowUp') next = Math.max(index - COLS, 0);
			else if (event.key === 'Home') next = 0;
			else if (event.key === 'End') next = buttons.length - 1;
			else if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				anchor?.focus();
				return;
			} else return;

			event.preventDefault();
			event.stopPropagation();
			buttons[next]?.focus();
		}

		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	});
</script>

{#if filteredEmojis.length}
	<div
		transition:fade={{ duration: 100 }}
		class="emojipicker"
		bind:this={menu}
		style={`left:${left}px;top:${top}px;visibility:${placed ? 'visible' : 'hidden'}`}
	>
		{#each filteredEmojis as emoji (emoji.url)}
			<button
				type="button"
				title={emoji.name}
				aria-label={emoji.name}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => onPick(emoji.name)}
			>
				<img src={emoji.url} alt={emoji.name} loading="lazy" draggable="false" />
			</button>
		{/each}
	</div>
{/if}
