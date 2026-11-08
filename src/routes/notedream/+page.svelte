<script lang="ts">
		import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="notedream" title="Note Dream - Violetproject" data={data} />