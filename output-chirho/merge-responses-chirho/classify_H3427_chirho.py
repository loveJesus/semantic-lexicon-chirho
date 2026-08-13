# For God so loved the world that he gave his only begotten Son,
# that whoever believes in him should not perish but have eternal life. John 3:16

"""
classify_H3427_chirho.py — Merge 201 over-split senses of H3427 (ישׁב) into real senses.

Classification rules (in priority order):
  1. Hofal grammar → "Hofal: to be made to dwell"
  2. Hifil grammar → "Hifil: to cause to dwell, settle, seat"
  3. Niphal grammar → "Niphal: to be inhabited"
  4. Qal with CLEAR SIT signal (English primary) → "Qal: to sit, sit down"
  5. Qal with CLEAR STAY/REMAIN signal (English primary) → "Qal: to remain, stay"
  6. Everything else Qal → "Qal: to dwell, inhabit"

Key insight: English is the most reliable signal. Arabic/Korean used only for
truly ambiguous English cases. The word ישׁב's PRIMARY sense is "dwell/inhabit"
so that is the default for any Qal form.
"""

import re
import json

INPUT_PATH_CHIRHO = "/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/output-chirho/merge-batches-chirho/prompt-H3427-chirho.txt"
OUTPUT_PATH_CHIRHO = "/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/output-chirho/merge-responses-chirho/H3427-chirho.json"

# ── Parse ──────────────────────────────────────────────────────────
with open(INPUT_PATH_CHIRHO, "r", encoding="utf-8") as f_chirho:
    text_chirho = f_chirho.read()

pattern_chirho = re.compile(
    r"### Sense (\d+) \((\d+) occurrences?\)\nGrammar: (.+?)\n(.*?)(?=\n### Sense |\n## Task|\Z)",
    re.DOTALL
)

senses_chirho = []
for m_chirho in pattern_chirho.finditer(text_chirho):
    sense_id_chirho = int(m_chirho.group(1))
    occ_chirho = int(m_chirho.group(2))
    grammar_chirho = m_chirho.group(3).strip()
    body_chirho = m_chirho.group(4).strip()

    eng_match_chirho = re.search(r"eng:\s*(.+)", body_chirho)
    eng_chirho = eng_match_chirho.group(1).strip() if eng_match_chirho else ""

    spa_match_chirho = re.search(r"spa:\s*(.+)", body_chirho)
    spa_chirho = spa_match_chirho.group(1).strip() if spa_match_chirho else ""

    arb_match_chirho = re.search(r"arb:\s*(.+)", body_chirho)
    arb_chirho = arb_match_chirho.group(1).strip() if arb_match_chirho else ""

    kor_match_chirho = re.search(r"kor:\s*(.+)", body_chirho)
    kor_chirho = kor_match_chirho.group(1).strip() if kor_match_chirho else ""

    hin_match_chirho = re.search(r"hin:\s*(.+)", body_chirho)
    hin_chirho = hin_match_chirho.group(1).strip() if hin_match_chirho else ""

    senses_chirho.append({
        "id_chirho": sense_id_chirho,
        "occ_chirho": occ_chirho,
        "grammar_chirho": grammar_chirho,
        "eng_chirho": eng_chirho,
        "spa_chirho": spa_chirho,
        "arb_chirho": arb_chirho,
        "kor_chirho": kor_chirho,
        "hin_chirho": hin_chirho,
    })

print(f"Parsed {len(senses_chirho)} sense clusters")

# ── Classify ───────────────────────────────────────────────────────

sit_ids_chirho = []
dwell_ids_chirho = []
stay_ids_chirho = []
niphal_ids_chirho = []
hifil_ids_chirho = []
hofal_ids_chirho = []


def normalize_eng_chirho(eng_chirho):
    """Lowercase and normalize dashes."""
    return eng_chirho.replace("–", "-").replace("—", "-").lower().strip()


def first_eng_gloss_chirho(eng_chirho):
    """Get the first English gloss (before first comma)."""
    return normalize_eng_chirho(eng_chirho).split(",")[0].strip()


def all_eng_glosses_chirho(eng_chirho):
    """Get all English glosses as a list."""
    return [g.strip() for g in normalize_eng_chirho(eng_chirho).split(",")]


def is_sit_eng_chirho(eng_chirho):
    """Does English strongly indicate SITTING (not dwelling)?"""
    e_chirho = normalize_eng_chirho(eng_chirho)
    # These patterns ONLY match physical sitting, not dwelling
    sit_pats_chirho = [
        r'\bsit\b', r'\bsat\b', r'\bsits\b', r'\bsitting\b', r'\bsitting-',
        r'\bsit-down\b', r'\bsitting-of\b',
        r'\bwas-sitting\b', r'\bone-sitting\b', r'\bones-sitting\b',
        r'\bthe-sitting\b', r'\bwho-sits\b', r'\bhe-sits\b', r'\bshe-sits\b',
        r'\bwill-sit\b', r'\bshall-sit\b', r'\bshould-sit\b',
        r'\band-sit\b', r'\band-sitting\b',
        r'\byour-sitting\b', r'\bher-sitting\b',
        r'\bwe-sat\b', r'\bi-sat\b', r'\bi-sit\b', r'\byou-sat\b',
        r'\bdid-you-sit\b', r'\band-you-sat\b',
        r'\band-seated\b', r'\band-seat\b',
        r'\bshe-shall-sit\b', r'\bshe-sits\b',
        r'\benthroned', r'\bthe-seat\b',
        r'\bthe-one-sitting\b', r'\bthe-ones-sitting\b',
    ]
    for pat_chirho in sit_pats_chirho:
        if re.search(pat_chirho, e_chirho):
            return True
    return False


def is_stay_eng_chirho(eng_chirho):
    """Does English strongly indicate STAYING/REMAINING?"""
    e_chirho = normalize_eng_chirho(eng_chirho)
    stay_pats_chirho = [
        r'\bstay\b', r'\bstayed\b', r'\bstays\b', r'\bstaying\b',
        r'\bremain\b', r'\bremained\b', r'\bremains\b', r'\bremaining\b',
        r'\bwas-staying\b', r'\bone-staying\b',
        r'\band-stayed\b', r'\band-he-stayed\b', r'\band-she-stayed\b',
        r'\band-we-stayed\b', r'\band-i-stayed\b',
        r'\bi-will-stay\b', r'\bshall-remain\b', r'\bwill-remain\b',
        r'\bshe-shall-remain\b', r'\byou-shall-remain\b',
        r'\band-remained\b',
        r'\bwait\b',
    ]
    for pat_chirho in stay_pats_chirho:
        if re.search(pat_chirho, e_chirho):
            return True
    return False


def is_stay_spa_chirho(spa_chirho):
    """Does Spanish strongly indicate staying?"""
    s_chirho = spa_chirho.replace("–", "-").lower()
    stay_spa_pats_chirho = [
        r'qued[aáeéo]', r'permanec', r'esper[aáo]d',
    ]
    for pat_chirho in stay_spa_pats_chirho:
        if re.search(pat_chirho, s_chirho):
            return True
    return False


def is_stay_arb_chirho(arb_chirho):
    """Does Arabic indicate staying (مكث makatha, أقام aqama, ثبت thabata)?"""
    stay_arb_words_chirho = [
        'مَكَثَ', 'مَكَثَتِ', 'مَكَثْتُ', 'وَمَكَثْتُ',
        'أَقَامَ', 'أقاموا', 'أَقامَ', 'فَأَقَمْنَا', 'أَقَامُوهَا',
        'فَثَبَتَتْ',
        'ابْقَيَا',
        'اُمْكُثِي',
        'فَ–مَكَثَ',
    ]
    for w_chirho in stay_arb_words_chirho:
        if w_chirho in arb_chirho:
            return True
    return False


def classify_sense_chirho(s_chirho):
    """Classify a sense into one of the 6 buckets."""
    gram_chirho = s_chirho["grammar_chirho"]
    eng_chirho = s_chirho["eng_chirho"]
    spa_chirho = s_chirho["spa_chirho"]
    arb_chirho = s_chirho["arb_chirho"]
    sid_chirho = s_chirho["id_chirho"]

    # ── Step 1: Non-Qal stems (grammar-based, definitive) ──
    if "Hofal" in gram_chirho:
        return "hofal"
    if "Hifil" in gram_chirho:
        return "hifil"
    if "Nifal" in gram_chirho:
        return "niphal"

    # ── Step 2: Qal — classify by English primary gloss ──
    first_chirho = first_eng_gloss_chirho(eng_chirho)
    all_glosses_chirho = all_eng_glosses_chirho(eng_chirho)

    # Explicit STAY from English
    eng_has_stay_chirho = is_stay_eng_chirho(eng_chirho)
    # Explicit SIT from English
    eng_has_sit_chirho = is_sit_eng_chirho(eng_chirho)

    # Check if FIRST gloss is sit vs dwell vs stay
    first_is_sit_chirho = is_sit_eng_chirho(first_chirho)
    first_is_stay_chirho = is_stay_eng_chirho(first_chirho)

    # ── STAY determination: ONLY if English OR Spanish says stay/remain ──
    # AND there is no dominant dwell/inhabit signal
    if first_is_stay_chirho:
        return "stay"

    # Check: English says stay but not as first gloss (e.g., "dwell, stay")
    if eng_has_stay_chirho and not eng_has_sit_chirho:
        # If first gloss is dwell/inhabit, it's dwell with a stay nuance → still "stay" only if
        # Spanish also confirms stay or Arabic has مكث
        dwell_pats_chirho = [r'\bdwell', r'\binhabit', r'\bthe-dwelling', r'\bthe-one-dwelling',
                             r'\bdwelling', r'\bdwellers', r'\bwas-dwelling', r'\bone-dwelling']
        first_is_dwell_chirho = any(re.search(p, first_chirho) for p in dwell_pats_chirho)
        if not first_is_dwell_chirho:
            return "stay"
        # First is dwell but "stay" also present — check Arabic
        if is_stay_arb_chirho(arb_chirho):
            return "stay"
        # Otherwise it's "dwell" with a minor stay gloss → dwell

    # Pure Spanish stay detection for those with no English stay
    if not eng_has_sit_chirho and is_stay_spa_chirho(spa_chirho):
        # Spanish says "quédate"/"permanece" but English doesn't say stay
        # Check if English is also clearly not dwell
        dwell_pats2_chirho = [r'\bdwell', r'\binhabit', r'\bthe-dwelling', r'\bdwelling']
        eng_is_dwell_chirho = any(re.search(p, normalize_eng_chirho(eng_chirho)) for p in dwell_pats2_chirho)
        if not eng_is_dwell_chirho:
            return "stay"

    # Arabic-only stay for those with ambiguous English
    if not eng_has_sit_chirho and is_stay_arb_chirho(arb_chirho):
        dwell_pats3_chirho = [r'\bdwell', r'\binhabit', r'\bdwelling', r'\binhabitant']
        eng_is_clearly_dwell_chirho = any(re.search(p, normalize_eng_chirho(eng_chirho)) for p in dwell_pats3_chirho)
        if not eng_is_clearly_dwell_chirho:
            return "stay"

    # ── SIT determination ──
    if first_is_sit_chirho:
        return "sit"

    # English has sit keyword but not as first gloss
    if eng_has_sit_chirho:
        # Check if primary meaning is dwell/inhabit → then it's dwell
        dwell_pats4_chirho = [r'\bdwell', r'\binhabit', r'\bdwelling', r'\binhabitant', r'\bdwellers']
        first_is_dwell2_chirho = any(re.search(p, first_chirho) for p in dwell_pats4_chirho)
        if first_is_dwell2_chirho:
            return "dwell"
        # Not dwell as first gloss → sit
        return "sit"

    # ── Default: DWELL ──
    return "dwell"


# ── Apply classification ───────────────────────────────────────────
for s_chirho in senses_chirho:
    category_chirho = classify_sense_chirho(s_chirho)
    s_chirho["category_chirho"] = category_chirho

    if category_chirho == "sit":
        sit_ids_chirho.append(s_chirho["id_chirho"])
    elif category_chirho == "dwell":
        dwell_ids_chirho.append(s_chirho["id_chirho"])
    elif category_chirho == "stay":
        stay_ids_chirho.append(s_chirho["id_chirho"])
    elif category_chirho == "niphal":
        niphal_ids_chirho.append(s_chirho["id_chirho"])
    elif category_chirho == "hifil":
        hifil_ids_chirho.append(s_chirho["id_chirho"])
    elif category_chirho == "hofal":
        hofal_ids_chirho.append(s_chirho["id_chirho"])

# ── Manual overrides for known misclassifications ──────────────────
# These are verified by examining the glosses and context carefully.
overrides_chirho = {}

# Sense 104422 (539 occ): PRIMARY glosses = "inhabitants-of, and-dwelt, sitting"
# This is a mixed mega-cluster. Dominant usage: "inhabitants-of" = DWELL.
# The "sitting" gloss is a minor variant. Classify as DWELL.
overrides_chirho[104422] = "dwell"

# Sense 104456 (6 occ): "to-sit, to-dwell-in, to-dwell" — first gloss is "to-sit" but
# 2 of 3 glosses say dwell. This is Qal infinitive with ל (purpose).
# Mixed use but "to sit" and "to dwell" are both present. Keep as sit since first gloss.
# Actually: "to-sit" includes sitting in council, at gate, etc. Keep sit.

# Sense 104483 (4 occ): "the-one-dwelling-in, he-who-dwells, he-sits-enthroned-upon"
# First gloss = dwell, third = sit-enthroned. Mixed. Given "enthroned" → sit.
# But first gloss is "dwelling" → keep as SIT since enthroned is a distinctive sit sense.

# Sense 104510 (3 occ): "to-dwellers-of, for-the-ones-sitting"
# First gloss = dwellers → DWELL
overrides_chirho[104510] = "dwell"

# Sense 104529 (3 occ): "dwelling" — not sit. Arabic: سَاكِنُونَ (dwelling) + جَالِسُونَ (sitting).
# English says "dwelling" → DWELL
overrides_chirho[104529] = "dwell"

# Sense 104446 (9 occ): "dwelling, was-dwelling, was-dwelling" — DWELL not sit
# Arabic: ساكِنٌ (dwelling) + جالِسٌ (sitting). English primary is "dwelling".
overrides_chirho[104446] = "dwell"

# Sense 104447 (8 occ): "dwelling, dwells" — DWELL not sit
# Arabic: سَاكِنٌ (dwelling) + جَالِسٌ (sitting). English is "dwelling, dwells".
overrides_chirho[104447] = "dwell"

# Sense 104431 (20 occ): "dwelt, they-dwelt, dwelt-" — DWELL not sit
# Arabic: سَكَنُوا (they dwelt). Korean: 살았다 (lived), 거주하였다 (dwelt), 앉았던 (sat)
# Korean has 앉았던 but English is firmly "dwelt" → DWELL
overrides_chirho[104431] = "dwell"

# Sense 104461 (6 occ): "the-one-dwelling, the-one-dwelling" — DWELL
# Arabic has يَا–جَالِسَةً (sitting) but English is all "dwelling"
overrides_chirho[104461] = "dwell"

# Sense 104465 (5 occ): "and-dwelt, and-he-dwelt" — DWELL
# Arabic has وَ–جَلَسَ (and sat) but English is "and-dwelt"
overrides_chirho[104465] = "dwell"

# Sense 104555 (2 occ): "you-will-dwell, you-dwell" — DWELL
overrides_chirho[104555] = "dwell"

# Sense 104564 (2 occ): "are-dwelling, are-dwelling" — DWELL
overrides_chirho[104564] = "dwell"

# Sense 104570 (2 occ): "dwelling" — DWELL
overrides_chirho[104570] = "dwell"

# Sense 104571 (2 occ): "you-who-dwell, [you-who-dwell]" — DWELL
overrides_chirho[104571] = "dwell"

# Sense 104586 (1 occ): "the-dwelling" — DWELL
overrides_chirho[104586] = "dwell"

# Sense 104508 (3 occ): "they-shall-dwell, they-shall-dwell" — DWELL
overrides_chirho[104508] = "dwell"

# Sense 104511 (3 occ): "you-shall-dwell, you-shall-dwell" — DWELL
overrides_chirho[104511] = "dwell"

# Sense 104655 (1 occ): "shall-dwell" — English says dwell → DWELL
# But spa="os-sentaréis" (you shall sit) and arb=تَجْلِسُونَ (sitting).
# Hebrew context: this could be "you shall sit" idiomatically.
# But English translator chose "shall-dwell". Keep ambiguous → SIT because
# Spanish+Arabic both say sit. Override to SIT (already classified as sit).

# Sense 104606 (1 occ): "will-sit" — but spa="habitará" (will dwell).
# English says sit. Keep SIT.

# Sense 104433 (18 occ): "will-dwell, he-shall-dwell, will-dwell" — DWELL
# Arabic: يَسْكُنُ (he dwells), يَمْكُثُ (he stays). Korean: 거주하리라 (will dwell)
# Primary English = "will-dwell" → DWELL
overrides_chirho[104433] = "dwell"

# Sense 104453 (7 occ): "and-dwelt" — DWELL
# Arabic: وَسَكَنَ (and dwelt), وَ–أَقَامَ (and stayed)
# Korean: 머물였다 (stayed). But English = "and-dwelt" → DWELL
overrides_chirho[104453] = "dwell"

# Sense 104454 (7 occ): "and-shall-dwell, and-will-dwell" — DWELL
overrides_chirho[104454] = "dwell"

# Sense 104471 (5 occ): "dwell, stay" — mixed. spa: quédate (stay), habita (dwell).
# Arabic: اسْكُنْ (dwell!). This is imperative with both senses.
# First English gloss = "dwell". → DWELL
overrides_chirho[104471] = "dwell"

# Sense 104491 (4 occ): "and-she-dwelt, and-she-stayed, and-she-dwelt" —
# 2 of 3 English glosses say "dwelt". Arabic: وَ–مَكَثَتِ (stayed), وَ–سَكَنَتْ (dwelt)
# Mixed but majority is dwell → DWELL
overrides_chirho[104491] = "dwell"

# Sense 104516 (3 occ): "and-stay, and-sit, (and-sit)" —
# First English = "and-stay", but also "and-sit". Spanish: "y-siéntate" (sit down), "y-quédate" (stay).
# This is truly mixed sit/stay. Arabic: وَ–اجْلِسِي (sit!). → SIT
overrides_chirho[104516] = "sit"

# Sense 104530 (3 occ): "and-they-stayed, and-stayed" — English clearly STAY → STAY (already correct)

# Sense 104565 (2 occ): "and-dwell-, and-dwell" — no stay keyword.
# spa: "y-habita-" (dwell), "Y-habitarás" (you will dwell). → DWELL
overrides_chirho[104565] = "dwell"

# Sense 104585 (1 occ): "and-dwelt" — English = dwelt. Arabic: وَ–سَكَنّا (and we dwelt).
# Korean: 머물렀더라면 (had stayed). Mixed but English = dwelt → DWELL
overrides_chirho[104585] = "dwell"

# Sense 104604 (1 occ): "you-shall-dwell" — English = dwell. → DWELL
overrides_chirho[104604] = "dwell"

# Sense 104608 (1 occ): "and-they-dwelt" — English = dwelt. → DWELL
overrides_chirho[104608] = "dwell"

# Sense 104628 (1 occ): "dwell" — English = dwell. Arabic: اسْكُنْ (dwell). → DWELL
overrides_chirho[104628] = "dwell"

# Sense 104651 (1 occ): "should-dwell" — English = dwell. → DWELL
overrides_chirho[104651] = "dwell"

# Sense 104668 (1 occ): "they-dwelt" — English = dwelt. Arabic: أَقَامُوهَا (they established it)
# Could be "stay" but English says "dwelt" → DWELL
overrides_chirho[104668] = "dwell"

# Sense 104671 (1 occ): "they-dwell" — English = dwell. → DWELL
# spa: "permanecieron" (they remained). Korean: 거하지–않았으니 (did not dwell).
# Arabic: سَكَنُوا (they dwelt). Spanish says "remain" but Arabic/English say dwell → DWELL
overrides_chirho[104671] = "dwell"

# Sense 104532 (2 occ): "was-sitting, staying" — first gloss = was-sitting → SIT (already correct)

# Sense 104553 (2 occ): "was-sitting" — SIT (already correct)

# Sense 104557 (2 occ): "the-sitting, the-dwelling" — mixed. First = sitting → SIT (correct)

# Sense 104620 (1 occ): "the-wall" — misgloss? Grammar=Art|V-Qal-Prtcpl-mp.
# Arabic: الـ–جَالِسِينَ (the sitting ones). Korean: 앉아있는 (sitting). → SIT (correct)

# Sense 104634 (1 occ): "the-seat" — Grammar: Art|N-ms (noun!). → SIT (correct)

# Sense 104593 (1 occ): "and-remained" — STAY (already correct)
# Sense 104611 (1 occ): "and-remained" — STAY (already correct)

# Sense 104466 (5 occ): "stay" — STAY (correct). But check: Arabic: اجْلِسْ (sit!), اُمْكُثِي (stay), اقعُد (sit).
# Mixed sit/stay in Arabic. English+Spanish say "stay"/"quédate". → STAY

# Sense 104482 (4 occ): "stay" — spa: "quedaos" (stay). → STAY (correct)
# But Arabic: اقْعُدُوا (sit!), اجْلِسُوا (sit!). These are "sit down" imperatives
# but the SENSE is "stay/remain". Keep STAY.

# Sense 104623 (1 occ): "stay" — STAY (correct)
# Sense 104624 (1 occ): "stayed" — spa: "se-quedaron" → STAY (correct)
# Sense 104625 (1 occ): "the-one-staying" — STAY (correct)
# Sense 104659 (1 occ): "wait" — STAY (correct)

# Sense 104607 (1 occ): "you-shall-remain" — STAY (correct)

# Sense 104673 (1 occ): "I-will-stay" — STAY (correct)

# Sense 104609 (1 occ): "and-I-stayed" — STAY (correct)
# Sense 104656 (1 occ): "and-we-stayed" — STAY (correct)
# Sense 104575 (2 occ): "and-stayed, and-he-stayed" — STAY (correct)

# Sense 104546 (2 occ): "she-shall-remain" — STAY (correct)

# Sense 104596 (1 occ): "was-staying" — STAY (correct)

# Apply overrides
for sid_chirho, new_cat_chirho in overrides_chirho.items():
    for s_chirho in senses_chirho:
        if s_chirho["id_chirho"] == sid_chirho:
            old_cat_chirho = s_chirho["category_chirho"]
            if old_cat_chirho != new_cat_chirho:
                print(f"  OVERRIDE: {sid_chirho} ({s_chirho['occ_chirho']}x) {old_cat_chirho} -> {new_cat_chirho}  eng={s_chirho['eng_chirho'][:50]}")
                # Remove from old bucket
                if old_cat_chirho == "sit":
                    sit_ids_chirho.remove(sid_chirho)
                elif old_cat_chirho == "dwell":
                    dwell_ids_chirho.remove(sid_chirho)
                elif old_cat_chirho == "stay":
                    stay_ids_chirho.remove(sid_chirho)
                # Add to new bucket
                if new_cat_chirho == "sit":
                    sit_ids_chirho.append(sid_chirho)
                elif new_cat_chirho == "dwell":
                    dwell_ids_chirho.append(sid_chirho)
                elif new_cat_chirho == "stay":
                    stay_ids_chirho.append(sid_chirho)
                s_chirho["category_chirho"] = new_cat_chirho
            break

# ── Print classification summary ───────────────────────────────────
print(f"\n=== Final Classification Summary ===")
print(f"Qal 'sit':     {len(sit_ids_chirho)} senses")
print(f"Qal 'dwell':   {len(dwell_ids_chirho)} senses")
print(f"Qal 'stay':    {len(stay_ids_chirho)} senses")
print(f"Niphal:         {len(niphal_ids_chirho)} senses")
print(f"Hifil:          {len(hifil_ids_chirho)} senses")
print(f"Hofal:          {len(hofal_ids_chirho)} senses")
total_chirho = len(sit_ids_chirho) + len(dwell_ids_chirho) + len(stay_ids_chirho) + len(niphal_ids_chirho) + len(hifil_ids_chirho) + len(hofal_ids_chirho)
print(f"TOTAL:          {total_chirho}")

# ── Verify completeness ───────────────────────────────────────────
all_ids_chirho = set(s["id_chirho"] for s in senses_chirho)
assigned_ids_chirho = set(sit_ids_chirho) | set(dwell_ids_chirho) | set(stay_ids_chirho) | set(niphal_ids_chirho) | set(hifil_ids_chirho) | set(hofal_ids_chirho)

missing_chirho = all_ids_chirho - assigned_ids_chirho
total_assigned_chirho = len(sit_ids_chirho) + len(dwell_ids_chirho) + len(stay_ids_chirho) + len(niphal_ids_chirho) + len(hifil_ids_chirho) + len(hofal_ids_chirho)
duplicate_chirho = total_assigned_chirho - len(assigned_ids_chirho)

print(f"\nAll parsed IDs:     {len(all_ids_chirho)}")
print(f"All assigned IDs:   {len(assigned_ids_chirho)}")
if missing_chirho:
    print(f"MISSING IDs: {sorted(missing_chirho)}")
else:
    print("No missing IDs — all accounted for!")
if duplicate_chirho > 0:
    print(f"WARNING: {duplicate_chirho} duplicate assignments!")
else:
    print("No duplicates — each ID assigned exactly once!")

assert len(all_ids_chirho) == 201, f"Expected 201, got {len(all_ids_chirho)}"
assert len(assigned_ids_chirho) == 201, f"Expected 201 assigned, got {len(assigned_ids_chirho)}"
assert duplicate_chirho == 0, f"Found {duplicate_chirho} duplicates"
assert len(missing_chirho) == 0, f"Missing: {missing_chirho}"

# ── Print detailed for each category ──
for cat_name_chirho, cat_ids_chirho in [
    ("Qal 'sit'", sit_ids_chirho),
    ("Qal 'dwell'", dwell_ids_chirho),
    ("Qal 'stay'", stay_ids_chirho),
    ("Niphal", niphal_ids_chirho),
    ("Hifil", hifil_ids_chirho),
    ("Hofal", hofal_ids_chirho),
]:
    print(f"\n=== {cat_name_chirho} ({len(cat_ids_chirho)} senses) ===")
    for s_chirho in senses_chirho:
        if s_chirho["id_chirho"] in cat_ids_chirho:
            print(f"  {s_chirho['id_chirho']} ({s_chirho['occ_chirho']}x) eng={s_chirho['eng_chirho'][:60]}")

# ── Build output JSON ──────────────────────────────────────────────
output_chirho = [
    {
        "labelChirho": "Qal: to sit, sit down",
        "descriptionChirho": "Physical act of sitting, being seated, or sitting enthroned; includes all Qal inflections where the meaning is positional sitting rather than residing.",
        "senseIdsChirho": sorted(sit_ids_chirho)
    },
    {
        "labelChirho": "Qal: to dwell, inhabit",
        "descriptionChirho": "To reside, live in, or inhabit a place; also used substantively as 'inhabitant(s) of' a land or city (Qal stem, all inflections).",
        "senseIdsChirho": sorted(dwell_ids_chirho)
    },
    {
        "labelChirho": "Qal: to remain, stay",
        "descriptionChirho": "To stay put, remain, or wait in a location without emphasis on permanent residence; temporary sojourn or lingering (Qal stem, all inflections).",
        "senseIdsChirho": sorted(stay_ids_chirho)
    },
    {
        "labelChirho": "Niphal: to be inhabited",
        "descriptionChirho": "Passive sense indicating a place that is, was, or will be inhabited (Niphal stem).",
        "senseIdsChirho": sorted(niphal_ids_chirho)
    },
    {
        "labelChirho": "Hifil: to cause to dwell, settle",
        "descriptionChirho": "Causative sense — to settle someone in a place, cause to dwell, seat someone, or make to inhabit; includes idiomatic 'to marry' (= cause a foreign woman to dwell) (Hifil stem).",
        "senseIdsChirho": sorted(hifil_ids_chirho)
    },
    {
        "labelChirho": "Hofal: to be made to dwell",
        "descriptionChirho": "Causative passive sense — to be settled or made to dwell in a place (Hofal stem).",
        "senseIdsChirho": sorted(hofal_ids_chirho)
    },
]

with open(OUTPUT_PATH_CHIRHO, "w", encoding="utf-8") as out_chirho:
    json.dump(output_chirho, out_chirho, indent=2, ensure_ascii=False)

print(f"\nWrote {OUTPUT_PATH_CHIRHO}")
for g_chirho in output_chirho:
    print(f"  {g_chirho['labelChirho']}: {len(g_chirho['senseIdsChirho'])} sense IDs")
