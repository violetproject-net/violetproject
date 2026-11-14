<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="citrus" title="Citrus - Violetproject" data={data} />
