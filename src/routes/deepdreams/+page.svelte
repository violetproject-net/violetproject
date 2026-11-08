<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="deepdreams" title="Deep Dreams - Violetproject" data={data} />
