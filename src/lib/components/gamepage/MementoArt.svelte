<script lang="ts">
	import { mementoArtUrls } from '../../gamepage/mementos.svelte';
	import type { Memento } from '../../gamepage/mementos.svelte';
	let {
		memento,
		size = 111,
		alt = ''
	}: {
		memento: Pick<Memento, 'name' | 'anim'>;
		size?: number;
		alt?: string;
	} = $props();
	let index = $state(0);
	let urls = $derived(mementoArtUrls(memento));
	let src = $derived(urls[index] ?? '');
	let exhausted = $derived(index >= urls.length);
	$effect(() => {
		void memento.name;
		void memento.anim;
		index = 0;
	});
	function onerror() {
		if (index < urls.length) index += 1;
	}
</script>

{#if !exhausted && src}
	<img
		class="mementoart"
		{src}
		alt={alt || memento.name}
		style={`--memento-size:${size}px`}
		loading="lazy"
		decoding="async"
		{onerror}
	/>
{:else}
	<div
		class="mementoart mementoart-missing"
		style={`--memento-size:${size}px`}
		title={memento.name}
		aria-label={memento.name}
	>
		?
	</div>
{/if}