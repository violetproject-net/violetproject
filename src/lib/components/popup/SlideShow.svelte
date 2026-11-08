<script lang="ts">
	import type { GameSlide } from '../../gameDetails';

	let { slides, alt }: { slides: GameSlide[]; alt: string } = $props();

	let index = $state(0);
	let count = $derived(Math.max(1, slides.length));

	const prev = () => (index = (index + count - 1) % count);
	const next = () => (index = (index + 1) % count);
</script>

{#if slides[index]}
	<img src={slides[index].src} alt={slides[index].alt ?? alt} />
{/if}

{#if slides.length > 1}
	<div class="dots">
		<button onclick={prev} title="Previous" aria-label="Previous">‹</button>
		{#each slides as _, i (i)}
			<button class:on={index === i} onclick={() => (index = i)} title="Slide {i + 1}" aria-label="Slide {i + 1}">●</button>
		{/each}
		<button onclick={next} title="Next" aria-label="Next">›</button>
	</div>
{/if}
