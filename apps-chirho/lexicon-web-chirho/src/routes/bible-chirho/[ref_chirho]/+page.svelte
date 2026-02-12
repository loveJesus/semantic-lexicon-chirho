<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();

	const BOOK_KEYS_CHIRHO: Record<number, string> = {
		1:'gen',2:'exod',3:'lev',4:'num',5:'deut',6:'josh',7:'judg',8:'ruth',
		9:'1sam',10:'2sam',11:'1kgs',12:'2kgs',13:'1chr',14:'2chr',15:'ezra',
		16:'neh',17:'esth',18:'job',19:'ps',20:'prov',21:'eccl',22:'song',
		23:'isa',24:'jer',25:'lam',26:'ezek',27:'dan',28:'hos',29:'joel',
		30:'amos',31:'obad',32:'jonah',33:'mic',34:'nah',35:'hab',36:'zeph',
		37:'hag',38:'zech',39:'mal',40:'matt',41:'mark',42:'luke',43:'john',
		44:'acts',45:'rom',46:'1cor',47:'2cor',48:'gal',49:'eph',50:'phil',
		51:'col',52:'1thess',53:'2thess',54:'1tim',55:'2tim',56:'titus',
		57:'phlm',58:'heb',59:'jas',60:'1pet',61:'2pet',62:'1john',63:'2john',
		64:'3john',65:'jude',66:'rev'
	};

	const BOOK_NAMES_CHIRHO: Record<number, string> = {
		1:'Genesis',2:'Exodus',3:'Leviticus',4:'Numbers',5:'Deuteronomy',
		6:'Joshua',7:'Judges',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
		11:'1 Kings',12:'2 Kings',13:'1 Chronicles',14:'2 Chronicles',
		15:'Ezra',16:'Nehemiah',17:'Esther',18:'Job',19:'Psalms',20:'Proverbs',
		21:'Ecclesiastes',22:'Song of Solomon',23:'Isaiah',24:'Jeremiah',
		25:'Lamentations',26:'Ezekiel',27:'Daniel',28:'Hosea',29:'Joel',
		30:'Amos',31:'Obadiah',32:'Jonah',33:'Micah',34:'Nahum',35:'Habakkuk',
		36:'Zephaniah',37:'Haggai',38:'Zechariah',39:'Malachi',
		40:'Matthew',41:'Mark',42:'Luke',43:'John',44:'Acts',45:'Romans',
		46:'1 Corinthians',47:'2 Corinthians',48:'Galatians',49:'Ephesians',
		50:'Philippians',51:'Colossians',52:'1 Thessalonians',53:'2 Thessalonians',
		54:'1 Timothy',55:'2 Timothy',56:'Titus',57:'Philemon',58:'Hebrews',
		59:'James',60:'1 Peter',61:'2 Peter',62:'1 John',63:'2 John',
		64:'3 John',65:'Jude',66:'Revelation'
	};

	const OT_BOOKS_CHIRHO = Array.from({length: 39}, (_, i) => i + 1);
	const NT_BOOKS_CHIRHO = Array.from({length: 27}, (_, i) => i + 40);

	let showBookPickerChirho = $state(false);
	let panelOpenChirho = $state(false);
	let panelWordChirho = $state<Record<string, any> | null>(null);
	let panelDataChirho = $state<Record<string, any> | null>(null);
	let panelLoadingChirho = $state(false);

	async function openSidePanelChirho(wChirho: Record<string, any>) {
		panelWordChirho = wChirho;
		panelOpenChirho = true;
		panelLoadingChirho = true;
		panelDataChirho = null;
		try {
			const resChirho = await fetch(`/api-chirho/sense-chirho/${wChirho.lemma_id_chirho}${wChirho.ordinal_chirho ? '?ordinal_chirho=' + wChirho.ordinal_chirho : ''}`);
			if (resChirho.ok) {
				panelDataChirho = await resChirho.json();
			}
		} catch { /* ignore fetch errors */ }
		panelLoadingChirho = false;
	}

	function closePanelChirho() {
		panelOpenChirho = false;
		panelWordChirho = null;
		panelDataChirho = null;
	}

	// Group words by verse
	function verseGroupsChirho() {
		const groupsChirho: Record<number, typeof data.wordsChirho> = {};
		for (const wChirho of data.wordsChirho) {
			const vChirho = wChirho.verse_chirho as number;
			if (!groupsChirho[vChirho]) groupsChirho[vChirho] = [];
			groupsChirho[vChirho].push(wChirho);
		}
		return Object.entries(groupsChirho)
			.map(([vChirho, wsChirho]) => ({ verseChirho: parseInt(vChirho), wordsChirho: wsChirho }))
			.sort((aChirho, bChirho) => aChirho.verseChirho - bChirho.verseChirho);
	}

	let versesChirho = $derived(verseGroupsChirho());
	let bookKeyChirho = $derived(BOOK_KEYS_CHIRHO[data.bookNumChirho] || data.bookKeyChirho);
</script>

<style>
	.word-chirho {
		display: inline-block;
		position: relative;
		padding: 2px 1px;
		border-radius: 3px;
		transition: background 0.15s;
		text-decoration: none;
		color: inherit;
	}
	.word-chirho:hover {
		background: var(--surface-chirho);
		text-decoration: none;
	}
	.word-surface-chirho {
		font-size: 19px;
		line-height: 1.4;
	}
	.word-sub-chirho {
		display: block;
		font-size: 10px;
		font-family: 'Source Sans 3', sans-serif;
		color: var(--muted-chirho);
		text-align: center;
		line-height: 1.1;
		margin-top: 1px;
		font-weight: 600;
	}
	.verse-row-chirho {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--border-chirho);
	}
	.verse-ref-chirho {
		min-width: 32px;
		color: var(--muted-chirho);
		font-size: 12px;
		font-family: 'Source Sans 3', sans-serif;
		font-weight: 600;
		padding-top: 4px;
		text-align: right;
		user-select: none;
	}
	.verse-text-chirho {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.verse-text-rtl-chirho {
		direction: rtl;
	}
	.nav-chirho {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 16px;
		flex-wrap: wrap;
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
	}
	.nav-chirho a {
		padding: 4px 10px;
		border-radius: 4px;
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
	}
	.chapter-grid-chirho {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.chapter-grid-chirho a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		font-size: 11px;
		font-family: 'Source Sans 3', sans-serif;
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 4px;
	}
	.chapter-grid-chirho a.active-chirho {
		background: var(--accent-chirho);
		color: #fff;
		font-weight: bold;
		border-color: var(--accent-chirho);
	}
	.book-picker-chirho {
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 16px;
	}
	.book-section-chirho {
		margin-bottom: 12px;
	}
	.book-section-chirho h3 {
		font-size: 11px;
		color: var(--muted-chirho);
		margin: 0 0 6px 0;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.book-grid-chirho {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
	}
	.book-grid-chirho a {
		padding: 3px 6px;
		font-size: 11px;
		font-family: 'Source Sans 3', sans-serif;
		background: none;
		border: 1px solid var(--border-chirho);
		border-radius: 3px;
		white-space: nowrap;
	}
	.book-grid-chirho a:hover {
		background: var(--border-chirho);
		text-decoration: none;
	}
	.book-grid-chirho a.current-chirho {
		background: var(--accent-chirho);
		color: #fff;
		border-color: var(--accent-chirho);
		font-weight: bold;
	}
	.picker-toggle-chirho {
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		color: var(--accent-chirho);
		padding: 6px 14px;
		border-radius: 6px;
		cursor: pointer;
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		font-weight: 600;
	}
	.picker-toggle-chirho:hover {
		border-color: var(--accent-chirho);
	}
	.panel-overlay-chirho {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.25);
		z-index: 90;
	}
	.sense-panel-chirho {
		position: fixed;
		top: 0;
		right: 0;
		width: min(420px, 90vw);
		height: 100vh;
		background: var(--bg-chirho, #faf8f3);
		border-left: 1px solid var(--border-chirho);
		box-shadow: -4px 0 24px rgba(0,0,0,0.10);
		z-index: 100;
		overflow-y: auto;
		padding: 20px 24px;
		font-family: 'Gentium Plus', serif;
	}
	.panel-close-chirho {
		position: absolute;
		top: 12px;
		right: 16px;
		background: none;
		border: none;
		font-size: 22px;
		cursor: pointer;
		color: var(--muted-chirho);
		padding: 4px 8px;
		border-radius: 4px;
	}
	.panel-close-chirho:hover {
		background: var(--surface-chirho);
		color: var(--fg-chirho);
	}
	.panel-headword-chirho {
		font-size: 28px;
		font-weight: bold;
		color: var(--fg-chirho);
	}
	.panel-meta-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		color: var(--muted-chirho);
		margin: 4px 0 12px 0;
	}
	.panel-sense-chirho {
		padding: 12px 16px;
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 6px;
		margin-bottom: 12px;
	}
	.panel-sense-label-chirho {
		font-weight: bold;
		font-size: 15px;
		color: var(--fg-chirho);
	}
	.panel-sense-desc-chirho {
		font-size: 13px;
		color: var(--muted-chirho);
		font-style: italic;
		margin-top: 4px;
		line-height: 1.5;
	}
	.panel-glosses-chirho {
		font-size: 13px;
		margin-top: 6px;
		line-height: 1.6;
	}
	.panel-gloss-lang-chirho {
		font-variant: small-caps;
		font-size: 11px;
		color: var(--muted-chirho);
		font-weight: bold;
		margin-right: 2px;
	}
	.panel-domain-chirho {
		display: inline-block;
		padding: 1px 7px;
		border-radius: 3px;
		font-size: 10px;
		font-family: 'Source Sans 3', sans-serif;
		font-weight: 600;
		margin-right: 4px;
		margin-top: 6px;
	}
	.panel-btn-chirho {
		display: inline-block;
		margin-top: 16px;
		padding: 8px 18px;
		background: var(--accent-chirho);
		color: #fff;
		border-radius: 6px;
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	.panel-btn-chirho:hover {
		opacity: 0.9;
		text-decoration: none;
	}
	.word-chirho {
		cursor: pointer;
	}
</style>

<div style="margin-bottom: 12px; font-family: 'Source Sans 3', sans-serif; font-size: 13px;">
	<a href="/" style="color: var(--muted-chirho);">Home</a>
	<span style="color: var(--border-chirho);"> / </span>
	<a href="/bible-chirho/{bookKeyChirho}.1" style="color: var(--muted-chirho);">{data.bookNameChirho}</a>
	<span style="color: var(--border-chirho);"> / </span>
	<span>{data.chapterChirho}</span>
</div>

<h1 style="margin-bottom: 8px;">{data.bookNameChirho} {data.chapterChirho}</h1>

<!-- Book picker toggle -->
<div style="margin-bottom: 12px;">
	<button class="picker-toggle-chirho" onclick={() => showBookPickerChirho = !showBookPickerChirho}>
		{showBookPickerChirho ? 'Hide' : 'Choose'} Book {showBookPickerChirho ? '&#9652;' : '&#9662;'}
	</button>
</div>

{#if showBookPickerChirho}
	<div class="book-picker-chirho">
		<div class="book-section-chirho">
			<h3>Old Testament</h3>
			<div class="book-grid-chirho">
				{#each OT_BOOKS_CHIRHO as bChirho}
					<a href="/bible-chirho/{BOOK_KEYS_CHIRHO[bChirho]}.1"
						class:current-chirho={bChirho === data.bookNumChirho}>{BOOK_NAMES_CHIRHO[bChirho]}</a>
				{/each}
			</div>
		</div>
		<div class="book-section-chirho">
			<h3>New Testament</h3>
			<div class="book-grid-chirho">
				{#each NT_BOOKS_CHIRHO as bChirho}
					<a href="/bible-chirho/{BOOK_KEYS_CHIRHO[bChirho]}.1"
						class:current-chirho={bChirho === data.bookNumChirho}>{BOOK_NAMES_CHIRHO[bChirho]}</a>
				{/each}
			</div>
		</div>
	</div>
{/if}

<div class="nav-chirho">
	{#if data.chapterChirho > 1}
		<a href="/bible-chirho/{bookKeyChirho}.{data.chapterChirho - 1}">Ch. {data.chapterChirho - 1}</a>
	{/if}
	<span style="color: var(--muted-chirho);">Chapter {data.chapterChirho} of {data.maxChapterChirho}</span>
	{#if data.chapterChirho < data.maxChapterChirho}
		<a href="/bible-chirho/{bookKeyChirho}.{data.chapterChirho + 1}">Ch. {data.chapterChirho + 1}</a>
	{/if}
</div>

<details style="margin-bottom: 16px;">
	<summary style="cursor: pointer; color: var(--muted-chirho); font-size: 12px; font-family: 'Source Sans 3', sans-serif;">All chapters</summary>
	<div class="chapter-grid-chirho" style="margin-top: 6px;">
		{#each Array.from({length: data.maxChapterChirho}, (_, i) => i + 1) as cChirho}
			<a href="/bible-chirho/{bookKeyChirho}.{cChirho}"
				class:active-chirho={cChirho === data.chapterChirho}>{cChirho}</a>
		{/each}
	</div>
</details>

<div style="font-family: 'Ezra SIL', 'Gentium Plus', 'Cardo', serif;">
	{#each versesChirho as vGroupChirho}
		<div class="verse-row-chirho">
			<div class="verse-ref-chirho">{vGroupChirho.verseChirho}</div>
			<div class="verse-text-chirho" class:verse-text-rtl-chirho={data.isOtChirho}>
				{#each vGroupChirho.wordsChirho as wChirho}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span class="word-chirho" onclick={(eChirho) => { eChirho.preventDefault(); openSidePanelChirho(wChirho); }} title="{wChirho.lemma_id_chirho} — {wChirho.grammar_chirho || ''}{wChirho.label_chirho ? ' — ' + wChirho.label_chirho : ''}">
						<span class="word-surface-chirho">{wChirho.surface_chirho}</span>
						<span class="word-sub-chirho">
							{wChirho.lemma_id_chirho}{#if wChirho.ordinal_chirho}.{wChirho.ordinal_chirho}{/if}
						</span>
					</span>
				{/each}
			</div>
		</div>
	{/each}
</div>

<!-- Side panel for sense info -->
{#if panelOpenChirho}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="panel-overlay-chirho" onclick={closePanelChirho}></div>
	<div class="sense-panel-chirho">
		<button class="panel-close-chirho" onclick={closePanelChirho}>&times;</button>

		{#if panelWordChirho}
			<div class="panel-headword-chirho" style:direction={data.isOtChirho ? 'rtl' : 'ltr'}>{panelWordChirho.surface_chirho}</div>
			<div class="panel-meta-chirho">
				{panelWordChirho.lemma_id_chirho}
				{#if panelWordChirho.ordinal_chirho}&nbsp;&middot;&nbsp;Sense {panelWordChirho.ordinal_chirho}{/if}
				{#if panelWordChirho.grammar_chirho}&nbsp;&middot;&nbsp;{panelWordChirho.grammar_chirho}{/if}
			</div>

			{#if panelLoadingChirho}
				<p style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">Loading sense data...</p>
			{:else if panelDataChirho}
				{#if panelDataChirho.lemmaChirho}
					<div style="font-size: 13px; color: var(--muted-chirho); font-style: italic; margin-bottom: 12px;">
						{panelDataChirho.lemmaChirho.gloss_terse_chirho || ''}
					</div>
				{/if}

				{#if panelDataChirho.targetSenseChirho}
					<div class="panel-sense-chirho">
						<div class="panel-sense-label-chirho">
							{panelDataChirho.targetSenseChirho.ordinal_chirho}. {panelDataChirho.targetSenseChirho.label_chirho || 'sense ' + panelDataChirho.targetSenseChirho.ordinal_chirho}
						</div>
						{#if panelDataChirho.targetSenseChirho.enriched_chirho || panelDataChirho.targetSenseChirho.description_chirho}
							<div class="panel-sense-desc-chirho">{panelDataChirho.targetSenseChirho.enriched_chirho || panelDataChirho.targetSenseChirho.description_chirho}</div>
						{/if}
						<div style="margin-top: 6px;">
							{#if panelDataChirho.targetSenseChirho.macro32_chirho}
								<span class="panel-domain-chirho" style="background: var(--green-bg-chirho, #e8f5e9); color: var(--green-chirho, #2e7d32);">{panelDataChirho.targetSenseChirho.macro32_chirho}</span>
							{/if}
							{#if panelDataChirho.targetSenseChirho.ln_domain_chirho}
								<span class="panel-domain-chirho" style="background: var(--blue-bg-chirho, #e3f2fd); color: var(--blue-chirho, #1565c0);">{panelDataChirho.targetSenseChirho.ln_domain_chirho}</span>
							{/if}
						</div>
						{#if panelDataChirho.glossesChirho && panelDataChirho.glossesChirho.length > 0}
							<div class="panel-glosses-chirho">
								{#each panelDataChirho.glossesChirho as gChirho, iChirho}
									<span class="panel-gloss-lang-chirho">{gChirho.language_code_chirho}</span>{gChirho.glosses_chirho}{#if iChirho < panelDataChirho.glossesChirho.length - 1}<span style="color: var(--border-chirho);"> &middot; </span>{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				{#if panelDataChirho.otherSensesChirho && panelDataChirho.otherSensesChirho.length > 0}
					<div style="font-family: 'Source Sans 3', sans-serif; font-size: 12px; color: var(--muted-chirho); margin-bottom: 8px;">
						{panelDataChirho.otherSensesChirho.length} other sense{panelDataChirho.otherSensesChirho.length !== 1 ? 's' : ''}:
					</div>
					{#each panelDataChirho.otherSensesChirho as osChirho}
						<div style="font-size: 13px; margin-bottom: 4px; padding-left: 12px; border-left: 2px solid var(--border-chirho);">
							<strong style="color: var(--accent-chirho);">{osChirho.ordinal_chirho}.</strong> {osChirho.label_chirho || 'sense ' + osChirho.ordinal_chirho}
							<span style="color: var(--muted-chirho); font-size: 11px;">&nbsp;({osChirho.occurrence_count_chirho}&times;)</span>
						</div>
					{/each}
				{/if}

				<a class="panel-btn-chirho" href="/lemma-chirho/{panelWordChirho.lemma_id_chirho}{panelWordChirho.ordinal_chirho ? '?sense_chirho=' + panelWordChirho.ordinal_chirho : ''}">
					View full entry
				</a>
			{:else}
				<p style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">
					{panelWordChirho.label_chirho || 'No additional sense data available.'}
				</p>
				<a class="panel-btn-chirho" href="/lemma-chirho/{panelWordChirho.lemma_id_chirho}{panelWordChirho.ordinal_chirho ? '?sense_chirho=' + panelWordChirho.ordinal_chirho : ''}">
					View full entry
				</a>
			{/if}
		{/if}
	</div>
{/if}
