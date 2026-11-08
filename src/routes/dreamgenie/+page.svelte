<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="dreamgenie" title="Dream Genie - Violetproject" data={data} />
