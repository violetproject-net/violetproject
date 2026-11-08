<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="setrow">
	<span>{label}</span>
	{@render children()}
</div>
