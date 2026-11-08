<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '../../i18n.svelte';
	import { fade, fly, scale } from "svelte/transition";
    import { quadOut, sineInOut } from 'svelte/easing';
    import { animValue } from '#lib/accessibility.ts';


	let {
		onClose,
		label,
		title = '',
		boxClass = '',
		children
	}: {
		onClose: () => void;
		label: string;
		title?: string;
		boxClass?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class="vp-backdrop"
	onclick={onClose}
	role="presentation"
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose();
	}}
	transition:fade={{ duration: 250, easing: sineInOut }}
>
	<div
		class="vp-box reportbox {boxClass}"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label={label}
		transition:scale={{ start: animValue(0.96), duration: animValue(250), opacity: 0.5, easing: quadOut }}
	>
		<div class="vp-head">
			{#if title}<b>{title}</b>{:else}<span></span>{/if}
			<button class="vp-close" onclick={onClose} title={t('app.close', 'Close')} aria-label={t('app.close', 'Close')}>×</button>
		</div>
		{@render children()}
	</div>
</div>
