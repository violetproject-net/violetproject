<script lang="ts">
		import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="blackrain" title="Black Rain - Violetproject" data={data} />