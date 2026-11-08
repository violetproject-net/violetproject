<script lang="ts">
		import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="loveyou" title="Love You - Violetproject" data={data} />