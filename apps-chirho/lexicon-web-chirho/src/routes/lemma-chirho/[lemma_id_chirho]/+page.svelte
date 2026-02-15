<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();

	// Read ?sense_chirho= query param for sense-anchoring from Bible view
	let targetSenseChirho = $derived(
		$page.url.searchParams.get('sense_chirho') ? parseInt($page.url.searchParams.get('sense_chirho')!) : null
	);
	let hasSenseAnchorChirho = $derived(targetSenseChirho !== null && !isNaN(targetSenseChirho!));
	let totalSensesChirho = $derived((data.sensesChirho as Record<string, any>[]).length);
	let otherSensesCountChirho = $derived(totalSensesChirho - 1);

	// Split senses: targeted sense separate from the rest
	let allSensesChirho = $derived(data.sensesChirho as Record<string, any>[]);
	let anchoredSenseChirho = $derived(
		hasSenseAnchorChirho ? allSensesChirho.find((sChirho) => sChirho.ordinal_chirho === targetSenseChirho) ?? null : null
	);
	let restSensesChirho = $derived(
		hasSenseAnchorChirho
			? allSensesChirho.filter((sChirho) => sChirho.ordinal_chirho !== targetSenseChirho)
			: allSensesChirho
	);

	// Extract headword from gloss_clean_chirho (first Hebrew/Greek word)
	function extractHeadwordChirho(glossChirho: string | null, lemmaIdChirho: string): string {
		if (!glossChirho) return lemmaIdChirho;
		// Hebrew: often starts with [word] or word followed by numbers/grammar
		const hebrewMatchChirho = glossChirho.match(/^\[?([^\]]+?)\]?\s/);
		if (hebrewMatchChirho) {
			// Return the first word/phrase before the grammar info
			const rawChirho = hebrewMatchChirho[1].trim();
			// If it contains Hebrew chars, return it
			if (/[\u0590-\u05FF]/.test(rawChirho)) return rawChirho;
		}
		// Greek: first word before comma or space
		const greekMatchChirho = glossChirho.match(/^([^\s,]+)/);
		if (greekMatchChirho && /[\u0370-\u03FF\u1F00-\u1FFF]/.test(greekMatchChirho[1])) {
			return greekMatchChirho[1];
		}
		// Fallback: first 40 chars or lemma ID
		return glossChirho.length > 40 ? lemmaIdChirho : glossChirho;
	}

	// External links
	function strongsUrlChirho(lemmaIdChirho: string): string {
		const numChirho = lemmaIdChirho.replace(/[^0-9]/g, '');
		const langChirho = lemmaIdChirho.startsWith('H') ? 'hebrew' : 'greek';
		return `https://biblehub.com/${langChirho}/${numChirho}.htm`;
	}
	function blueletterUrlChirho(lemmaIdChirho: string): string {
		return `https://www.blueletterbible.org/lexicon/${lemmaIdChirho.toLowerCase()}/kjv/wlc/0-1/`;
	}

	let showFullBdbChirho = $state(false);

	const BOOK_NAMES_CHIRHO: Record<number, string> = {
		1:'Gen',2:'Exod',3:'Lev',4:'Num',5:'Deut',6:'Josh',7:'Judg',8:'Ruth',
		9:'1 Sam',10:'2 Sam',11:'1 Kgs',12:'2 Kgs',13:'1 Chr',14:'2 Chr',15:'Ezra',
		16:'Neh',17:'Esth',18:'Job',19:'Ps',20:'Prov',21:'Eccl',22:'Song',
		23:'Isa',24:'Jer',25:'Lam',26:'Ezek',27:'Dan',28:'Hos',29:'Joel',
		30:'Amos',31:'Obad',32:'Jonah',33:'Mic',34:'Nah',35:'Hab',36:'Zeph',
		37:'Hag',38:'Zech',39:'Mal',40:'Matt',41:'Mark',42:'Luke',43:'John',
		44:'Acts',45:'Rom',46:'1 Cor',47:'2 Cor',48:'Gal',49:'Eph',50:'Phil',
		51:'Col',52:'1 Thess',53:'2 Thess',54:'1 Tim',55:'2 Tim',56:'Titus',
		57:'Phlm',58:'Heb',59:'Jas',60:'1 Pet',61:'2 Pet',62:'1 John',63:'2 John',
		64:'3 John',65:'Jude',66:'Rev'
	};

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

	const LANG_LABELS_CHIRHO: Record<string, string> = {
		eng:'EN',spa:'ES',fra:'FR',deu:'DE',por:'PT',
		zho:'ZH',jpn:'JA',kor:'KO',hin:'HI',arb:'AR',
		ind:'ID',swa:'SW',rus:'RU',vie:'VI',tha:'TH',
		tur:'TR',ita:'IT'
	};

	function glossesBySenseChirho(senseIdChirho: number) {
		return (data.glossesChirho as Record<string, any>[]).filter(
			(gChirho) => gChirho.sense_id_chirho === senseIdChirho
		);
	}

	function refsBySenseChirho(senseIdChirho: number) {
		return (data.refsChirho as Record<string, any>[]).filter(
			(rChirho) => rChirho.sense_id_chirho === senseIdChirho
		);
	}

	function formatRefLinkChirho(rChirho: Record<string, any>): { textChirho: string, hrefChirho: string } {
		const bookChirho = BOOK_NAMES_CHIRHO[rChirho.book_chirho] || `Bk${rChirho.book_chirho}`;
		const keyChirho = BOOK_KEYS_CHIRHO[rChirho.book_chirho] || rChirho.book_chirho;
		return {
			textChirho: `${bookChirho} ${rChirho.chapter_chirho}:${rChirho.verse_chirho}`,
			hrefChirho: `/bible-chirho/${keyChirho}.${rChirho.chapter_chirho}`
		};
	}

	// First Bible reference for "Read in Bible" link (must be after formatRefLinkChirho)
	let firstRefChirho = $derived(
		(data.refsChirho as Record<string, any>[]).length > 0
			? formatRefLinkChirho((data.refsChirho as Record<string, any>[])[0])
			: null
	);

	let lChirho = $derived(data.lemmaChirho as Record<string, any>);
	let isHebrewChirho = $derived(lChirho.language_chirho === 'heb' || lChirho.language_chirho === 'arc');
	let headwordTextChirho = $derived(extractHeadwordChirho(lChirho.gloss_clean_chirho, lChirho.lemma_id_chirho));

	// Composed glosses (must be after lChirho)
	let summaryGlossChirho = $derived(
		lChirho.gloss_terse_chirho ||
		allSensesChirho
			.map((sChirho: Record<string, any>) => sChirho.label_chirho)
			.filter(Boolean)
			.join('; ')
	);
	let readableGlossChirho = $derived(lChirho.gloss_readable_chirho || '');

	// BDB text (must be after lChirho)
	let bdbFullChirho = $derived(lChirho.gloss_clean_chirho || lChirho.article_chirho || '');
	let hasBdbChirho = $derived(bdbFullChirho.length > 0);
	let bdbIsLongChirho = $derived(bdbFullChirho.length > 500);
	function bdbPreviewChirho(fullTextChirho: string): string {
		if (fullTextChirho.length <= 500) return fullTextChirho;
		const cutChirho = fullTextChirho.substring(0, 400);
		const lastSpaceChirho = cutChirho.lastIndexOf(' ');
		return cutChirho.substring(0, lastSpaceChirho > 300 ? lastSpaceChirho : 400);
	}

	// Bold Hebrew/Greek characters in BDB text for readability
	function boldOriginalChirho(textChirho: string): string {
		// HTML-escape non-original-script text to prevent XSS
		const escapedChirho = textChirho
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
		// Wrap runs of Hebrew (U+0590-U+05FF, U+FB1D-U+FB4F) and Greek (U+0370-U+03FF, U+1F00-U+1FFF) in <strong>
		return escapedChirho.replace(
			/([\u0590-\u05FF\uFB1D-\uFB4F]+|[\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]+)/g,
			'<strong style="font-weight:700;color:var(--fg-chirho)">$1</strong>'
		);
	}
</script>

<style>
	.entry-chirho {
		max-width: 820px;
		font-size: 15px;
		line-height: 1.75;
		text-align: justify;
	}
	.header-chirho {
		margin-bottom: 16px;
		text-align: left;
	}
	.headword-chirho {
		font-family: 'Ezra SIL', 'Gentium Plus', serif;
		font-size: 36px;
		font-weight: bold;
		color: var(--fg-chirho);
		letter-spacing: 0.5px;
	}
	.lemma-id-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 14px;
		color: var(--muted-chirho);
		margin-left: 12px;
		vertical-align: middle;
		font-weight: 600;
	}
	.meta-line-chirho {
		margin: 6px 0 4px 0;
		font-family: 'Source Sans 3', sans-serif;
	}
	.pos-chirho {
		font-style: italic;
		color: var(--purple-chirho);
		font-size: 17px;
	}
	.freq-chirho {
		font-size: 16px;
		color: var(--muted-chirho);
	}
	.summary-gloss-chirho {
		margin: 8px 0 4px 0;
		font-size: 14px;
		font-style: italic;
		color: var(--muted-chirho);
		line-height: 1.5;
	}
	.readable-gloss-chirho {
		margin: 6px 0 12px 0;
		font-size: 14px;
		line-height: 1.7;
		color: var(--fg-chirho);
		text-align: justify;
	}
	.ext-links-chirho {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin: 10px 0 4px 0;
	}
	.ext-link-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 12px;
		font-weight: 600;
		padding: 3px 10px;
		border: 1px solid var(--border-chirho);
		border-radius: 3px;
		color: var(--muted-chirho);
		text-decoration: none;
		background: var(--surface-chirho);
	}
	.ext-link-chirho:hover {
		color: var(--accent-chirho);
		border-color: var(--accent-chirho);
	}
	.senses-header-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--muted-chirho);
		margin: 0 0 8px 0;
	}
	.sense-chirho {
		margin: 16px 0;
		padding-left: 24px;
		border-left: 3px solid var(--border-chirho);
	}
	.sense-num-chirho {
		font-weight: bold;
		color: var(--accent-chirho);
		font-family: 'Source Sans 3', sans-serif;
		font-size: 15px;
		margin-right: 6px;
	}
	.sense-label-chirho {
		font-weight: bold;
		color: var(--fg-chirho);
		font-size: 16px;
	}
	.sense-desc-chirho {
		font-style: italic;
		color: var(--muted-chirho);
		font-size: 14px;
	}
	.domain-tag-chirho {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 3px;
		font-size: 11px;
		font-family: 'Source Sans 3', sans-serif;
		font-weight: 600;
		text-decoration: none;
		vertical-align: middle;
	}
	.domain-tag-chirho:hover {
		text-decoration: underline;
	}
	.macro-tag-chirho { background: var(--green-bg-chirho); color: var(--green-chirho); }
	.ln-tag-chirho { background: var(--blue-bg-chirho); color: var(--blue-chirho); }
	.comm-tag-chirho { background: var(--purple-bg-chirho); color: var(--purple-chirho); }
	.glosses-chirho {
		margin: 6px 0 6px 16px;
		font-size: 14px;
		line-height: 1.6;
	}
	.gloss-lang-chirho {
		font-variant: small-caps;
		color: var(--muted-chirho);
		font-size: 12px;
		margin-right: 3px;
		font-weight: bold;
	}
	.refs-chirho {
		margin: 6px 0 0 16px;
		font-size: 13px;
		color: var(--muted-chirho);
	}
	.refs-chirho a {
		color: var(--muted-chirho);
	}
	.refs-chirho a:hover {
		color: var(--accent-chirho);
	}
	.occ-chirho {
		font-size: 12px;
		color: var(--muted-chirho);
		float: right;
		font-family: 'Source Sans 3', sans-serif;
		font-weight: 600;
	}
	.sense-highlight-chirho {
		background: var(--blue-bg-chirho);
		border-left-color: var(--accent-chirho) !important;
		border-radius: 0 6px 6px 0;
		padding: 12px 16px 12px 24px;
		margin-left: -24px;
		margin-right: -8px;
	}
	.more-senses-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		color: var(--accent-chirho);
		background: var(--blue-bg-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 4px;
		padding: 6px 14px;
		margin: 8px 0 16px 0;
		display: inline-block;
	}
	.divider-chirho {
		border: none;
		border-top: 1px solid var(--border-chirho);
		margin: 20px 0;
	}
	.bdb-section-chirho {
		margin-top: 12px;
	}
	.bdb-label-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--muted-chirho);
		margin: 0 0 6px 0;
	}
	.bdb-text-chirho {
		padding: 12px 16px;
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 4px;
		white-space: normal;
		word-wrap: break-word;
		text-align: justify;
		font-size: 13px;
		line-height: 1.7;
		color: var(--muted-chirho);
	}
	.bdb-toggle-chirho {
		display: inline-block;
		font-size: 12px;
		color: var(--accent-chirho);
		cursor: pointer;
		margin-top: 6px;
		font-family: 'Source Sans 3', sans-serif;
		font-weight: 600;
		border: none;
		background: none;
		padding: 0;
	}
	.bdb-toggle-chirho:hover {
		text-decoration: underline;
	}
</style>

<div style="margin-bottom: 12px; font-family: 'Source Sans 3', sans-serif; font-size: 13px;">
	<a href="/search-chirho" style="color: var(--muted-chirho);">Search</a>
	<span style="color: var(--border-chirho);"> / </span>
	<span>{lChirho.lemma_id_chirho}</span>
</div>

<div class="entry-chirho">

	<!-- Header: headword + ID + POS/freq + summary gloss -->
	<div class="header-chirho">
		<div style="margin-bottom: 2px;">
			<span class="headword-chirho" style:direction={isHebrewChirho ? 'rtl' : 'ltr'}>
				{headwordTextChirho}
			</span>
			<span class="lemma-id-chirho">{lChirho.lemma_id_chirho}</span>
		</div>

		<div class="meta-line-chirho">
			{#if lChirho.pos_chirho}
				<span class="pos-chirho">{lChirho.pos_chirho}</span>
				<span style="color: var(--border-chirho);">&nbsp;|&nbsp;</span>
			{/if}
			<span class="freq-chirho">
				{lChirho.occurrence_count_chirho}&times; in {lChirho.sense_count_chirho} sense{lChirho.sense_count_chirho !== 1 ? 's' : ''}
			</span>
		</div>

		{#if summaryGlossChirho}
			<div class="summary-gloss-chirho">{summaryGlossChirho}</div>
		{/if}

		{#if readableGlossChirho}
			<div class="readable-gloss-chirho">{readableGlossChirho}</div>
		{/if}

		<div class="ext-links-chirho">
			{#if firstRefChirho}
				<a class="ext-link-chirho" href={firstRefChirho.hrefChirho} style="background: var(--accent-chirho); color: #fff; border-color: var(--accent-chirho);">Read in Bible &rarr;</a>
			{/if}
			<a class="ext-link-chirho" href={strongsUrlChirho(lChirho.lemma_id_chirho)} target="_blank" rel="noopener">Strong's / BibleHub</a>
			<a class="ext-link-chirho" href={blueletterUrlChirho(lChirho.lemma_id_chirho)} target="_blank" rel="noopener">Blue Letter Bible</a>
		</div>
	</div>

	<!-- Anchored sense (shown first when arriving from Bible view) -->
	{#if anchoredSenseChirho}
		{@const sChirho = anchoredSenseChirho}
		{@const glossListChirho = glossesBySenseChirho(sChirho.sense_id_chirho)}
		{@const refListChirho = refsBySenseChirho(sChirho.sense_id_chirho)}
		<div class="sense-chirho sense-highlight-chirho" style="margin-top: 4px;">
			<div>
				<span class="sense-num-chirho">{sChirho.ordinal_chirho}.</span>
				<span class="sense-label-chirho">{sChirho.label_chirho || 'sense ' + sChirho.ordinal_chirho}</span>
				{#if sChirho.enriched_chirho || sChirho.description_chirho}
					&mdash; <span class="sense-desc-chirho">{sChirho.enriched_chirho || sChirho.description_chirho}</span>
				{/if}
				<span class="occ-chirho">{sChirho.occurrence_count_chirho}&times;</span>
			</div>
			<div style="margin-top: 4px;">
				{#if sChirho.macro32_chirho}
					<a href="/domain-chirho/{encodeURIComponent(sChirho.macro32_chirho)}" class="domain-tag-chirho macro-tag-chirho">{sChirho.macro32_chirho}</a>
				{/if}
				{#if sChirho.ln_domain_chirho}
					<span style="color: var(--muted-chirho); font-size: 10px;">&rsaquo;</span>
					<a href="/domain-chirho/{encodeURIComponent(sChirho.ln_domain_chirho)}" class="domain-tag-chirho ln-tag-chirho">{sChirho.ln_domain_chirho}</a>
				{/if}
				{#if sChirho.community_chirho}
					<span style="color: var(--muted-chirho); font-size: 10px;">&rsaquo;</span>
					<a href="/domain-chirho/{encodeURIComponent(sChirho.community_chirho)}" class="domain-tag-chirho comm-tag-chirho">{sChirho.community_chirho}</a>
				{/if}
			</div>
			{#if glossListChirho.length > 0}
				<div class="glosses-chirho">
					{#each glossListChirho as gChirho, iChirho}
						<span class="gloss-lang-chirho">{LANG_LABELS_CHIRHO[gChirho.language_code_chirho] || gChirho.language_code_chirho}</span>{gChirho.glosses_chirho.replaceAll('","', '", "')}{#if iChirho < glossListChirho.length - 1}<span style="color: var(--border-chirho);"> &middot; </span>{/if}
					{/each}
				</div>
			{/if}
			{#if refListChirho.length > 0}
				<div class="refs-chirho">
					{#each refListChirho.slice(0, 12) as rChirho, iChirho}
						{@const linkChirho = formatRefLinkChirho(rChirho)}
						<a href={linkChirho.hrefChirho}>{linkChirho.textChirho}</a>{#if iChirho < Math.min(refListChirho.length, 12) - 1},&nbsp;{/if}
					{/each}
					{#if refListChirho.length > 12}
						<span>&nbsp;(+{refListChirho.length - 12} more)</span>
					{/if}
				</div>
			{/if}
			{#if otherSensesCountChirho > 0}
				<div class="more-senses-chirho">
					&#9660; {otherSensesCountChirho} more sense{otherSensesCountChirho !== 1 ? 's' : ''} below
				</div>
			{/if}
		</div>
	{/if}

	<hr class="divider-chirho" />

	<!-- Senses section -->
	<div class="senses-header-chirho">Senses</div>

	{#each restSensesChirho as sChirho}
		{@const glossListChirho = glossesBySenseChirho(sChirho.sense_id_chirho)}
		{@const refListChirho = refsBySenseChirho(sChirho.sense_id_chirho)}
		<div class="sense-chirho">
			<div>
				<span class="sense-num-chirho">{sChirho.ordinal_chirho}.</span>
				<span class="sense-label-chirho">{sChirho.label_chirho || 'sense ' + sChirho.ordinal_chirho}</span>
				{#if sChirho.enriched_chirho || sChirho.description_chirho}
					&mdash; <span class="sense-desc-chirho">{sChirho.enriched_chirho || sChirho.description_chirho}</span>
				{/if}
				<span class="occ-chirho">{sChirho.occurrence_count_chirho}&times;</span>
			</div>

			<div style="margin-top: 4px;">
				{#if sChirho.macro32_chirho}
					<a href="/domain-chirho/{encodeURIComponent(sChirho.macro32_chirho)}" class="domain-tag-chirho macro-tag-chirho">{sChirho.macro32_chirho}</a>
				{/if}
				{#if sChirho.ln_domain_chirho}
					<span style="color: var(--muted-chirho); font-size: 10px;">&rsaquo;</span>
					<a href="/domain-chirho/{encodeURIComponent(sChirho.ln_domain_chirho)}" class="domain-tag-chirho ln-tag-chirho">{sChirho.ln_domain_chirho}</a>
				{/if}
				{#if sChirho.community_chirho}
					<span style="color: var(--muted-chirho); font-size: 10px;">&rsaquo;</span>
					<a href="/domain-chirho/{encodeURIComponent(sChirho.community_chirho)}" class="domain-tag-chirho comm-tag-chirho">{sChirho.community_chirho}</a>
				{/if}
			</div>

			{#if glossListChirho.length > 0}
				<div class="glosses-chirho">
					{#each glossListChirho as gChirho, iChirho}
						<span class="gloss-lang-chirho">{LANG_LABELS_CHIRHO[gChirho.language_code_chirho] || gChirho.language_code_chirho}</span>{gChirho.glosses_chirho.replaceAll('","', '", "')}{#if iChirho < glossListChirho.length - 1}<span style="color: var(--border-chirho);"> &middot; </span>{/if}
					{/each}
				</div>
			{/if}

			{#if refListChirho.length > 0}
				<div class="refs-chirho">
					{#each refListChirho.slice(0, 12) as rChirho, iChirho}
						{@const linkChirho = formatRefLinkChirho(rChirho)}
						<a href={linkChirho.hrefChirho}>{linkChirho.textChirho}</a>{#if iChirho < Math.min(refListChirho.length, 12) - 1},&nbsp;{/if}
					{/each}
					{#if refListChirho.length > 12}
						<span>&nbsp;(+{refListChirho.length - 12} more)</span>
					{/if}
				</div>
			{/if}
		</div>
	{/each}

	<!-- Related senses (other lemmas in the same semantic domain) -->
	{#if (data.relatedSensesChirho as Record<string, any>[]).length > 0}
		<hr class="divider-chirho" />
		<div class="senses-header-chirho">Related Senses</div>
		<div style="display: flex; flex-wrap: wrap; gap: 6px;">
			{#each (data.relatedSensesChirho as Record<string, any>[]) as rsChirho}
				<a href="/lemma-chirho/{rsChirho.lemma_id_chirho}?sense_chirho={rsChirho.ordinal_chirho}" style="display: inline-block; padding: 4px 10px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px; font-size: 13px; font-family: 'Source Sans 3', sans-serif; text-decoration: none; color: var(--fg-chirho);">
					<strong style="color: var(--accent-chirho);">{rsChirho.lemma_id_chirho}</strong>
					<span style="color: var(--muted-chirho);">{rsChirho.ordinal_chirho}.</span>
					{rsChirho.label_chirho || ''}
					<span style="font-size: 11px; color: var(--muted-chirho);">({rsChirho.occurrence_count_chirho}&times;)</span>
				</a>
			{/each}
		</div>
	{/if}

	<!-- BDB / Lexicon Reference (collapsible preview) -->
	{#if hasBdbChirho}
		<hr class="divider-chirho" />
		<div class="bdb-section-chirho">
			<div class="bdb-label-chirho">BDB / Lexicon Reference</div>
			<div class="bdb-text-chirho">
				{#if showFullBdbChirho || !bdbIsLongChirho}
					{@html boldOriginalChirho(bdbFullChirho)}
				{:else}
					{@html boldOriginalChirho(bdbPreviewChirho(bdbFullChirho))}&hellip;
				{/if}
			</div>
			{#if bdbIsLongChirho}
				<button class="bdb-toggle-chirho" onclick={() => showFullBdbChirho = !showFullBdbChirho}>
					{showFullBdbChirho ? 'Show less' : 'View full BDB entry...'}
				</button>
			{/if}
		</div>
	{/if}
</div>
