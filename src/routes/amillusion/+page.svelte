<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="amillusion" title="Amillusion - Violetproject" data={data} />
