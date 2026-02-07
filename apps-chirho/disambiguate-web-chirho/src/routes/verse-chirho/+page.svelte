<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<h1>Verse Browser</h1>

<div style="display: flex; gap: 24px; margin-top: 16px;">
	<div style="min-width: 200px;">
		<h3 style="color: var(--muted-chirho);">Books</h3>
		<div style="max-height: 400px; overflow-y: auto;">
			{#each data.booksChirho as bChirho}
				<a href="/verse-chirho?book={bChirho.book_chirho}"
				   style="display: block; padding: 4px 8px; border-radius: 4px; margin-bottom: 2px;
				          {data.bookChirho == bChirho.book_chirho ? 'background: var(--surface-chirho); color: var(--accent-chirho);' : ''}">
					Book {bChirho.book_chirho}
					<span style="color: var(--muted-chirho); font-size: 11px;">({bChirho.verse_count_chirho})</span>
				</a>
			{/each}
		</div>
	</div>

	{#if data.chaptersChirho.length > 0}
		<div style="min-width: 200px;">
			<h3 style="color: var(--muted-chirho);">Chapters (Book {data.bookChirho})</h3>
			<div style="max-height: 400px; overflow-y: auto;">
				{#each data.chaptersChirho as cChirho}
					<a href="/verse-chirho?book={data.bookChirho}&chapter={cChirho.chapter_chirho}"
					   style="display: block; padding: 4px 8px; border-radius: 4px; margin-bottom: 2px;
					          {data.chapterChirho == cChirho.chapter_chirho ? 'background: var(--surface-chirho); color: var(--accent-chirho);' : ''}">
						Chapter {cChirho.chapter_chirho}
						<span style="color: var(--muted-chirho); font-size: 11px;">({cChirho.verse_count_chirho})</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	{#if data.versesChirho.length > 0}
		<div style="flex: 1;">
			<h3 style="color: var(--muted-chirho);">Verses (Book {data.bookChirho}, Ch {data.chapterChirho})</h3>
			{#each data.versesChirho as vChirho}
				<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 6px; padding: 12px; margin-bottom: 8px;">
					<a href="/verse-chirho/{vChirho.verse_id_chirho}" style="color: var(--accent-chirho); font-weight: bold;">
						{data.bookChirho}:{data.chapterChirho}:{vChirho.verse_chirho}
					</a>
					<div style="margin-top: 4px; color: var(--muted-chirho); font-size: 13px; direction: rtl; text-align: right;">
						{vChirho.text_chirho}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
