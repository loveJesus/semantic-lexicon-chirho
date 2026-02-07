<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>semantic-chirho — Disambiguation</title>
	<style>
		:root {
			--bg-chirho: #0a0a0a;
			--fg-chirho: #e8e8e8;
			--accent-chirho: #4a9eff;
			--border-chirho: #2a2a2a;
			--surface-chirho: #141414;
			--muted-chirho: #888;
		}
		body {
			font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
			background: var(--bg-chirho);
			color: var(--fg-chirho);
			margin: 0;
			padding: 0;
			font-size: 14px;
			line-height: 1.6;
		}
		a { color: var(--accent-chirho); text-decoration: none; }
		a:hover { text-decoration: underline; }
	</style>
</svelte:head>

<nav style="border-bottom: 1px solid var(--border-chirho); padding: 12px 24px; display: flex; gap: 24px; align-items: center;">
	<strong style="color: var(--accent-chirho);">semantic-chirho</strong>
	<a href="/">Home</a>
	<a href="/lemma-chirho">Lemmas</a>
	<a href="/domain-chirho">Domains</a>
	<a href="/verse-chirho">Verses</a>
	<a href="/review-chirho/queue-chirho">Review</a>
	<a href="/scorecard-chirho">Scorecard</a>
</nav>

<main style="max-width: 1200px; margin: 0 auto; padding: 24px;">
	{@render children()}
</main>
