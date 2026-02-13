<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>Biblical Lexicon</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Gentium+Plus:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
	<style>
		@font-face {
			font-family: 'Ezra SIL';
			src: url('/fonts-chirho/EzraSIL-chirho.woff') format('woff');
			font-weight: normal;
			font-style: normal;
			font-display: swap;
		}
		:root {
			--bg-chirho: #f8f5ef;
			--fg-chirho: #2d2a24;
			--accent-chirho: #1a5276;
			--border-chirho: #d4cfc5;
			--surface-chirho: #efece4;
			--muted-chirho: #7a756b;
			--green-chirho: #2c6e49;
			--blue-chirho: #1a5276;
			--purple-chirho: #6a3d7d;
			--green-bg-chirho: #e8f5e9;
			--blue-bg-chirho: #e3f2fd;
			--purple-bg-chirho: #f3e5f5;
		}
		body {
			font-family: 'Gentium Plus', 'Cardo', 'Georgia', serif;
			background: var(--bg-chirho);
			color: var(--fg-chirho);
			margin: 0;
			padding: 0;
			font-size: 15px;
			line-height: 1.7;
		}
		a { color: var(--accent-chirho); text-decoration: none; }
		a:hover { text-decoration: underline; }
		h1, h2, h3 {
			font-family: 'Source Sans 3', 'Helvetica Neue', sans-serif;
			font-weight: 700;
			color: var(--fg-chirho);
		}
		table { border-collapse: collapse; width: 100%; }
		th { font-family: 'Source Sans 3', sans-serif; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted-chirho); }
		td { vertical-align: top; }
	</style>
</svelte:head>

<nav style="border-bottom: 1px solid var(--border-chirho); padding: 10px 24px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; background: #f2efe7; font-family: 'Source Sans 3', sans-serif; font-size: 14px;">
	<strong style="color: var(--accent-chirho); font-size: 15px; letter-spacing: 0.3px;">lexicon-chirho</strong>
	<a href="/">Home</a>
	<a href="/bible-chirho/gen.1">Bible</a>
	<a href="/search-chirho">Search</a>
	<a href="/domain-chirho">Domains</a>
	<a href="/methodology-chirho">Methodology</a>
	<a href="/about-chirho">About</a>
	<a href="https://github.com/andrewbethchirho/semantic-chirho" style="margin-left: auto; color: var(--muted-chirho); font-size: 12px;">GitHub</a>
</nav>

<main style="max-width: 1100px; margin: 0 auto; padding: 24px 32px;">
	{@render children()}
</main>

<footer style="border-top: 1px solid var(--border-chirho); padding: 14px 24px; color: var(--muted-chirho); font-size: 12px; text-align: center; margin-top: 48px; font-family: 'Source Sans 3', sans-serif;">
	Biblical Lexicon &mdash; 14,884 lemmas &middot; 20,143 senses &middot; 448,269 words &middot; 43 languages
	&middot; <a href="https://bible.systems" style="color: var(--muted-chirho);">bible.systems</a>
</footer>
