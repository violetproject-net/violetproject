<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="doorofthoughts" title="The Door Of Thoughts - Violetproject" data={data} />
