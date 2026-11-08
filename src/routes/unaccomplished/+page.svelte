<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="unaccomplished" title="Unaccomplished - Violetproject" data={data} />
