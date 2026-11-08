<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="mirchway" title="Rightmock Mirchway - Violetproject" data={data} />
