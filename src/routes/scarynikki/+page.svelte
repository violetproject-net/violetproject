<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="scarynikki" title="Scary Nikki - Violetproject" data={data} />
