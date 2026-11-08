<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="somnium" title="Somnium - Violetproject" data={data} />
