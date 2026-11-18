<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="sheawaits" title="She Awaits - Violetproject" data={data} />
