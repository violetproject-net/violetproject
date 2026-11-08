<script lang="ts">
	import GamePage from '../../lib/components/GamePage.svelte';

	let { data } = $props();
</script>

<GamePage game="yumetsushin" title="Yume Tsushin - Violetproject" data={data} />
