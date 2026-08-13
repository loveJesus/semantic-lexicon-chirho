# For God so loved the world that he gave his only begotten Son,
# that whoever believes in him should not perish but have eternal life. - John 3:16

"""
merge_h7725_chirho.py — Merge 218 over-split senses of H7725 (שׁוּב) into real senses.

Guidance senses:
1. Qal "to return, come/go back" — physical return, all Qal inflections ONE sense
2. Qal "to repent, turn back to God" — spiritual return/repentance
3. Qal "to turn away, apostatize" (with מן or מאחרי) — turning from God
4. Hifil "to bring back, restore" — causative return
5. Hifil "to turn back, repel" (enemies) — military repulse / turn away wrath
6. Polel/Piel "to restore, refresh" — intensive restoration
7. Hifil "to answer, reply" — Hifil with sense of returning a word/answer
8. Hofal passive — "to be returned/restored"
"""

import json
import re

# Parse all senses from the prompt file
senses_chirho = {}

with open("/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/output-chirho/merge-batches-chirho/prompt-H7725-chirho.txt", "r") as f_chirho:
    content_chirho = f_chirho.read()

# Extract each sense block
pattern_chirho = r'### Sense (\d+) \((\d+) occurrences?\)\nGrammar: (.+)\n((?:  \w+: .+\n)*)'
matches_chirho = re.findall(pattern_chirho, content_chirho)

for match_chirho in matches_chirho:
    sense_id_chirho = int(match_chirho[0])
    occ_count_chirho = int(match_chirho[1])
    grammar_chirho = match_chirho[2].strip()
    gloss_block_chirho = match_chirho[3].strip()

    # Extract English glosses
    eng_line_chirho = ""
    for line_chirho in gloss_block_chirho.split("\n"):
        if line_chirho.strip().startswith("eng:"):
            eng_line_chirho = line_chirho.strip()[4:].strip()
            break

    senses_chirho[sense_id_chirho] = {
        "id_chirho": sense_id_chirho,
        "count_chirho": occ_count_chirho,
        "grammar_chirho": grammar_chirho,
        "eng_chirho": eng_line_chirho,
    }

print(f"Parsed {len(senses_chirho)} senses")

# Now classify each sense into one of the merged groups
# We need to detect:
# - Stem: Qal, Hifil, Piel, Polel, Hofal, Nifal
# - For Hifil: is it "answer/reply" sense or "bring back/restore" sense?
# - For Qal: is it basic "return" or something else?

# Group 1: Qal "to return, come/go back" — physical return (the mega-group)
# Group 2: Qal "to repent, turn back to God" — requires contextual analysis but
#           the automated clusters don't split by context, so almost all Qal go to Group 1
# Group 3: Qal "to turn away, apostatize" — similar, context-dependent
# Group 4: Hifil "to bring back, restore" — causative return
# Group 5: Hifil "to answer, reply" — Hifil with answer/reply glosses
# Group 6: Hifil "to turn back, repel" — Hifil with repel/repay glosses
# Group 7: Polel/Piel "to restore, refresh" — intensive
# Group 8: Hofal "to be returned/restored" — passive

group_qal_return_chirho = []       # 1: Qal return (physical)
group_qal_repent_chirho = []       # 2: Qal repent/turn back to God
group_qal_turn_away_chirho = []    # 3: Qal turn away/apostatize
group_hifil_restore_chirho = []    # 4: Hifil bring back/restore
group_hifil_answer_chirho = []     # 5: Hifil answer/reply
group_hifil_repel_chirho = []      # 6: Hifil turn back/repel/repay
group_polel_restore_chirho = []    # 7: Polel/Piel restore
group_hofal_chirho = []            # 8: Hofal passive

def classify_sense_chirho(sid_chirho, info_chirho):
    """Classify a sense into one of the merged groups."""
    grammar_chirho = info_chirho["grammar_chirho"]
    eng_chirho = info_chirho["eng_chirho"].lower()

    # Check for Hofal
    if "Hofal" in grammar_chirho:
        return "hofal"

    # Check for Polel or Piel
    if "Polel" in grammar_chirho or "Piel" in grammar_chirho:
        return "polel"

    # Check for Hifil
    if "Hifil" in grammar_chirho:
        # Check if it's the "answer/reply" sense
        answer_words_chirho = ["answer", "reply", "respond", "cause–me–to–answer"]
        if any(w_chirho in eng_chirho for w_chirho in answer_words_chirho):
            return "hifil_answer"

        # Check if it's "repay" or "turn away wrath" / military repulse
        repel_words_chirho = ["repay", "repaid", "turn–away", "turn-away", "turn away", "reject", "rechac"]
        if any(w_chirho in eng_chirho for w_chirho in repel_words_chirho):
            return "hifil_repel"

        # Default Hifil: bring back / restore
        return "hifil_restore"

    # Everything else is Qal (or has both Qal and Hifil tags)
    # Check for mixed Qal+Hifil grammar
    if "Qal" in grammar_chirho:
        # Check for repentance context clues
        repent_words_chirho = ["repent", "turn–back–to–god"]
        if any(w_chirho in eng_chirho for w_chirho in repent_words_chirho):
            return "qal_repent"

        # Check for apostasy/turning away
        apostasy_words_chirho = ["apostatize", "turned-away", "turn-away"]
        if any(w_chirho in eng_chirho for w_chirho in apostasy_words_chirho):
            return "qal_turn_away"

        # Default Qal: physical return
        return "qal_return"

    # Fallback: if grammar doesn't contain any stem marker, look at glosses
    return "qal_return"

# Now let's handle the tricky cases where grammar has BOTH Qal and Hifil
# We need to look more carefully at those

for sid_chirho, info_chirho in senses_chirho.items():
    grammar_chirho = info_chirho["grammar_chirho"]
    eng_chirho = info_chirho["eng_chirho"].lower()

    # Special handling for senses that have mixed stems in grammar
    has_hifil_chirho = "Hifil" in grammar_chirho
    has_qal_chirho = "Qal" in grammar_chirho
    has_piel_chirho = "Piel" in grammar_chirho
    has_polel_chirho = "Polel" in grammar_chirho
    has_hofal_chirho = "Hofal" in grammar_chirho

    classification_chirho = classify_sense_chirho(sid_chirho, info_chirho)

    if classification_chirho == "hofal":
        group_hofal_chirho.append(sid_chirho)
    elif classification_chirho == "polel":
        group_polel_restore_chirho.append(sid_chirho)
    elif classification_chirho == "hifil_answer":
        group_hifil_answer_chirho.append(sid_chirho)
    elif classification_chirho == "hifil_repel":
        group_hifil_repel_chirho.append(sid_chirho)
    elif classification_chirho == "hifil_restore":
        group_hifil_restore_chirho.append(sid_chirho)
    elif classification_chirho == "qal_repent":
        group_qal_repent_chirho.append(sid_chirho)
    elif classification_chirho == "qal_turn_away":
        group_qal_turn_away_chirho.append(sid_chirho)
    else:
        group_qal_return_chirho.append(sid_chirho)

# Now handle special cases manually based on careful reading:

# Sense 138676 has BOTH V-Qal-Imperf-2ms AND V-Hifil-Imperf-2mp
# eng: "you–shall–return, you-shall-return" — mixed. Since it contains Hifil with "devolveréis",
# let's check if it was already placed. The classifier checks Hifil first only if no Qal.
# Actually, the classifier checks Hofal -> Polel -> Hifil -> Qal in order.
# For 138676, grammar has both Hifil and Qal, so Hifil wins. Let's verify.

# Sense 138693 has V-Hifil-Prtcpl-ms, V-Hifil-Imperf-3fp, V-Qal-Perf-3ms
# eng: "returning, return, restores" — mixed Hifil/Qal. Hifil wins in classifier.

# Sense 138705 has V-Qal-Imperf-3ms, V-Hifil-Imperf-3ms
# eng: "turn–back, returning, [ketiv:He–brings–back]" — mixed

# Sense 138753 has V-Qal-Imperf-3ms, V-Hifil-Imperf-3ms
# eng: "returns, [ketiv]" — these are Qere/Ketiv variants

# Sense 138805 has V-Hifil-Perf-2ms, V-Qal-Perf-2ms
# eng: "you–turned–from, you–restored" — mixed

# For mixed senses, the Hifil classification is usually correct since the algorithm
# grouped these together because they share some signal. Let's keep the classifier's output.

# Now let's handle senses where Qal should be split into "repent" vs "turn away":
# The automated clusters don't split by theological context, so we can't reliably
# distinguish repentance from physical return from the glosses alone.
# However, certain senses have clear "turn" / "turn back" language that suggests
# spiritual turning:

# Sense 138647: eng "turn, return–" with arb "تُوبُوا" (repent!) and swa "tubuni" (repent)
# This is clearly repentance. Move it to qal_repent.
# Sense 138647 grammar: V-Qal-Imp-mp, V-Qal-Imperf-2mp

# Sense 138759: eng "you–turn–back, you-turn-away" — "turn away" suggests apostasy
# Sense 138823: eng "turn" — too generic
# Sense 138845: eng "you–turn–back"
# Sense 138878: eng "(you–will–turn)" with spa "te–apartarás" (you will turn away)

# Let's refine: senses with "turn away" or "turn back" (without "bring") in Qal
# could be either repentance or apostasy depending on context.
# Since we can't tell from glosses alone, let's use the Arabic/Swahili hints:
# Arabic "تُوبُوا" = repent (from tawba)
# Swahili "tubuni" = repent

# Manual reclassifications:
manual_to_qal_repent_chirho = set()
manual_to_qal_turn_away_chirho = set()

# 138647: has arb تُوبُوا (repent!) -> repentance sense
if 138647 in group_qal_return_chirho:
    group_qal_return_chirho.remove(138647)
    group_qal_repent_chirho.append(138647)
    manual_to_qal_repent_chirho.add(138647)

# 138759: "you–turn–back, you-turn-away" with "os–volvéis, os–volviereis" -> turning away
if 138759 in group_qal_return_chirho:
    group_qal_return_chirho.remove(138759)
    group_qal_turn_away_chirho.append(138759)
    manual_to_qal_turn_away_chirho.add(138759)

# 138756: "turned-away, he-turned-back" with spa "se–apartó" (turned away) -> apostasy
if 138756 in group_qal_return_chirho:
    group_qal_return_chirho.remove(138756)
    group_qal_turn_away_chirho.append(138756)
    manual_to_qal_turn_away_chirho.add(138756)

# 138878: "(you–will–turn)" with spa "te–apartarás" -> turning away
if 138878 in group_qal_return_chirho:
    group_qal_return_chirho.remove(138878)
    group_qal_turn_away_chirho.append(138878)
    manual_to_qal_turn_away_chirho.add(138878)

# 138823: "turn" with spa "os–volvéis" -> turning (away?)
# 138845: "you–turn–back" with spa "os–volvéis"
# These are ambiguous "turn/turn back" which in context often means turning away.
if 138823 in group_qal_return_chirho:
    group_qal_return_chirho.remove(138823)
    group_qal_turn_away_chirho.append(138823)
    manual_to_qal_turn_away_chirho.add(138823)

if 138845 in group_qal_return_chirho:
    group_qal_return_chirho.remove(138845)
    group_qal_turn_away_chirho.append(138845)
    manual_to_qal_turn_away_chirho.add(138845)

# 138908: "turn–back" with "volver" — Qal Perf 3cp "they turned back" — could be apostasy
# arb "يَرْجِعُوا" is neutral. swa "wasirudi" = "they did not return" — keep in Qal return.
# Actually let's keep it in return since the glosses are neutral.

# For Hifil "answer/reply" sense - let's also check:
# 138709: "answer–me, brought-back-me" — mixed answer + bring back. "answer–me" is clear.
# Already classified as hifil_answer due to "answer" in eng.

# 138764: "to–reply" — clearly answer sense
# Already classified as hifil_answer.

# 138771: "shall–I–answer–Him, I–will–answer–him" — answer sense
# Already classified as hifil_answer.

# 138827: "cause–me–to–answer" — answer sense
# Already classified as hifil_answer.

# 138860: "and–answer-me" — answer sense
# Already classified as hifil_answer.

# 138870: "shall–I–answer–you" — answer sense
# Already classified as hifil_answer.

# 138874: "who–return" with spa "los–que–responden" (those who respond) — answer sense
# Check if classified correctly.

# 138890: "to–return" with spa "para–responder" and arb "لِ–أُجِيبَ" (to answer) — answer sense
# eng says "to–return" but other languages say "answer". The Hifil inf here is "answer".

# 138905: "to–repay" — this is a "repay" sense, which is Hifil repel/repay
# Already classified as hifil_repel due to "repay".

# 138858: "Repay" — Hifil repay
# Check: "Repay" contains "repay" -> hifil_repel? No, "repay" check is lowercase.
# Let me verify: eng_chirho = "repay" (lowercase). repel_words has "repay" -> yes, hifil_repel.

# 138900: "and–he-rendered" with spa "Y–pagaba" (paid) — this is render/repay
# eng: "and–he-rendered" — doesn't match repay/repel words. It's classified as hifil_restore.
# Should be hifil_repel (repay sense).
if 138900 in group_hifil_restore_chirho:
    group_hifil_restore_chirho.remove(138900)
    group_hifil_repel_chirho.append(138900)

# 138760: "and–repaid–, and–He-returned" — "repaid" -> should be hifil_repel
# Check: eng "and–repaid–, and–he-returned". "repaid" matches "repai" -> not in our list.
# Let's check: repel_words has "repay", "repaid". Actually I only have "repay". Let me add.
# The classifier was already run. Let me check if 138760 was classified as repel.
# eng: "and–repaid–, and–he-returned" — lowercase: "and–repaid–, and–he-returned"
# "repai" is in there... but we check "repay" not "repaid". Let's fix:
if 138760 in group_hifil_restore_chirho:
    group_hifil_restore_chirho.remove(138760)
    group_hifil_repel_chirho.append(138760)

# 138832: "and–he–returned–" with spa "y–devolvió" (returned/repaid)
# This is a standard Hifil "bring back / restore" — keep as is.

# 138745: "I–will–turn–away, I–will–return" — has "turn–away" -> hifil_repel
# Should already be classified. Check: "turn–away" -> "turn-away" in repel words?
# repel_words has "turn–away" (with em dash). eng has "i–will–turn–away" with em dashes.
# Let me check: "turn–away" should match. Yes, classified as hifil_repel.

# 138765: "turn–away, turn-away" -> hifil_repel (already classified)

# 138797: "turn–away" -> hifil_repel (already classified)

# 138916: "returns" with spa "respondía" (she answered) — this is answer sense
# eng: "returns" — doesn't match answer words. Needs manual reclassification.
if 138916 in group_hifil_restore_chirho:
    group_hifil_restore_chirho.remove(138916)
    group_hifil_answer_chirho.append(138916)

# 138917: "will–answer–you" — already hifil_answer

# 138874: "who–return" with spa "los–que–responden" — Hifil Prtcpl. Answer sense.
# eng: "who–return" — doesn't contain "answer". Classified as hifil_restore.
if 138874 in group_hifil_restore_chirho:
    group_hifil_restore_chirho.remove(138874)
    group_hifil_answer_chirho.append(138874)

# 138890: "to–return" with spa "para–responder" — answer sense
if 138890 in group_hifil_restore_chirho:
    group_hifil_restore_chirho.remove(138890)
    group_hifil_answer_chirho.append(138890)

# 138854: "to–answer" — has "answer" -> hifil_answer (already classified)

# 138910: "[ketiv:and-he-shall-turn]" — Hifil ConjImperf Jus, ketiv reading
# This is a textual variant. Keep in hifil_restore.

# 138719: "[ketiv:I–will–return], [I–will–restore]" — Qal Imperf 1cs ketiv
# This is Qal. But wait — "[I–will–restore]" suggests Hifil reading.
# Grammar says V-Qal-Imperf-1cs. The ketiv/qere issue means the consonantal text
# could be read as Qal or Hifil. Keep in Qal return for the ketiv reading.

# 138898: "[returning]" — Hifil Imperf 3ms. Keep in hifil_restore.

# 138662: "restore–us, Restore–us" — grammar has BOTH V-Hifil-Imp-ms|1cp AND V-Qal-Imp-ms|1cp
# This is the famous "Hashivenu" (restore us) — typically Hifil causative "cause us to return"
# Already classified as hifil_restore (Hifil takes priority).

# 138766: "restore, rescue" — Hifil Imp. hifil_restore.

# 138880: "and–turns" with spa "y–hace–volver" (and causes to return) and
# arb "وَ–يُديرُ" (and he turns/directs) — standard Hifil.
# Keep in hifil_restore.

# Sense 138835: "but–I–will–restore" — Qal ConjPerf 1cs but eng says "restore"
# Grammar: Conj-w | V-Qal-ConjPerf-1cs
# This is Qal but translated "restore" — contextual meaning. Keep in Qal return.
# Actually "restore" in Qal is unusual. Let's check spa: "y–restauraré" (and I will restore)
# arb: "وَأَرُدُّ" — this is Form I of رَدَّ (to return/restore).
# The Hebrew grammar tag says Qal, so keep in Qal.

# 138914: "restoring" — V-Qal-Prtcpl-ms but eng "restoring" and arb "أُرْجِعُ" (Hifil-like)
# Grammar says Qal Participle. Keep in Qal but note it may be a Polel mistagged.
# hin: "फिरानेवाला–हूँ" (one who causes to return) — suggests causative.
# Let's leave in Qal return since grammar tag says Qal.

# Now handle the Polel/Piel group:
# 138788: Conj-w | V-Piel-ConjPerf-1cs — "and–I-will-turn-you-about" -> Piel intensive
# 138894: Conj-w | V-Piel-ConjPerf-1cs — "and–I–will–bring–back" -> Piel
# 138885: Prep-l | V-Piel-Inf — "to–bring-back" -> Piel
# 138767: V-Hifil-Prtcpl-ms, V-Piel-Prtcpl-ms — "restorer–of, restorer" -> mixed Hifil/Piel
#   This one has both Hifil and Piel, classified as Hifil.
#   Since it means "restorer" (Polel/Piel intensive sense), move to polel.
if 138767 in group_hifil_restore_chirho:
    group_hifil_restore_chirho.remove(138767)
    group_polel_restore_chirho.append(138767)

# Now let's merge small groups if needed:
# If qal_repent and qal_turn_away are too small, that's fine — they represent real senses.
# If hofal has very few, that's also fine — it's a real distinct sense (passive).

# Print group sizes
print(f"\nGroup sizes:")
print(f"  Qal return (physical):     {len(group_qal_return_chirho)} senses")
print(f"  Qal repent (spiritual):    {len(group_qal_repent_chirho)} senses")
print(f"  Qal turn away (apostasy):  {len(group_qal_turn_away_chirho)} senses")
print(f"  Hifil restore/bring back:  {len(group_hifil_restore_chirho)} senses")
print(f"  Hifil answer/reply:        {len(group_hifil_answer_chirho)} senses")
print(f"  Hifil repel/repay:         {len(group_hifil_repel_chirho)} senses")
print(f"  Polel/Piel restore:        {len(group_polel_restore_chirho)} senses")
print(f"  Hofal passive:             {len(group_hofal_chirho)} senses")

total_assigned_chirho = (len(group_qal_return_chirho) + len(group_qal_repent_chirho) +
                         len(group_qal_turn_away_chirho) + len(group_hifil_restore_chirho) +
                         len(group_hifil_answer_chirho) + len(group_hifil_repel_chirho) +
                         len(group_polel_restore_chirho) + len(group_hofal_chirho))
print(f"\nTotal assigned: {total_assigned_chirho}")
print(f"Total parsed:   {len(senses_chirho)}")

# Verify completeness
all_assigned_chirho = set(group_qal_return_chirho + group_qal_repent_chirho +
                          group_qal_turn_away_chirho + group_hifil_restore_chirho +
                          group_hifil_answer_chirho + group_hifil_repel_chirho +
                          group_polel_restore_chirho + group_hofal_chirho)
all_parsed_chirho = set(senses_chirho.keys())
missing_chirho = all_parsed_chirho - all_assigned_chirho
duplicates_chirho = total_assigned_chirho - len(all_assigned_chirho)

if missing_chirho:
    print(f"\nWARNING: Missing sense IDs: {sorted(missing_chirho)}")
if duplicates_chirho > 0:
    print(f"\nWARNING: {duplicates_chirho} duplicate assignments detected!")

# Check for duplicates across groups
all_groups_chirho = [
    ("qal_return", group_qal_return_chirho),
    ("qal_repent", group_qal_repent_chirho),
    ("qal_turn_away", group_qal_turn_away_chirho),
    ("hifil_restore", group_hifil_restore_chirho),
    ("hifil_answer", group_hifil_answer_chirho),
    ("hifil_repel", group_hifil_repel_chirho),
    ("polel_restore", group_polel_restore_chirho),
    ("hofal", group_hofal_chirho),
]

seen_chirho = {}
for group_name_chirho, group_ids_chirho in all_groups_chirho:
    for sid_chirho in group_ids_chirho:
        if sid_chirho in seen_chirho:
            print(f"  DUPLICATE: {sid_chirho} in both {seen_chirho[sid_chirho]} and {group_name_chirho}")
        seen_chirho[sid_chirho] = group_name_chirho

assert len(all_assigned_chirho) == len(senses_chirho), (
    f"Mismatch: {len(all_assigned_chirho)} assigned vs {len(senses_chirho)} parsed. "
    f"Missing: {sorted(all_parsed_chirho - all_assigned_chirho)}"
)
assert duplicates_chirho == 0, f"{duplicates_chirho} duplicates found!"

print("\nAll senses accounted for, no duplicates. Building JSON output...")

# Build the JSON output
output_chirho = []

if group_qal_return_chirho:
    output_chirho.append({
        "labelChirho": "to return, come/go back (Qal)",
        "descriptionChirho": "Physical or spatial return; coming or going back to a place, person, or prior state — the basic Qal meaning of שׁוּב covering all inflections (perfect, imperfect, imperative, infinitive, participle).",
        "senseIdsChirho": sorted(group_qal_return_chirho)
    })

if group_qal_repent_chirho:
    output_chirho.append({
        "labelChirho": "to repent, turn back to God (Qal)",
        "descriptionChirho": "Spiritual return or repentance — turning back to God, often in prophetic exhortations, where שׁוּב carries the theological sense of covenant renewal and moral reformation.",
        "senseIdsChirho": sorted(group_qal_repent_chirho)
    })

if group_qal_turn_away_chirho:
    output_chirho.append({
        "labelChirho": "to turn away, apostatize (Qal)",
        "descriptionChirho": "Turning away from God or from a right path — apostasy or defection, often with מן (from) or מאחרי (from after), denoting spiritual or relational departure.",
        "senseIdsChirho": sorted(group_qal_turn_away_chirho)
    })

if group_hifil_restore_chirho:
    output_chirho.append({
        "labelChirho": "to bring back, restore (Hifil)",
        "descriptionChirho": "Causative return — causing someone or something to return, bringing back, restoring to a former state or place; the primary Hifil meaning of שׁוּב.",
        "senseIdsChirho": sorted(group_hifil_restore_chirho)
    })

if group_hifil_answer_chirho:
    output_chirho.append({
        "labelChirho": "to answer, reply (Hifil)",
        "descriptionChirho": "Returning a word — the Hifil of שׁוּב used idiomatically to mean 'answer' or 'reply', i.e., bringing back a response or message to someone.",
        "senseIdsChirho": sorted(group_hifil_answer_chirho)
    })

if group_hifil_repel_chirho:
    output_chirho.append({
        "labelChirho": "to turn back, repel, repay (Hifil)",
        "descriptionChirho": "Turning back or repelling — the Hifil of שׁוּב used for repulsing enemies, averting wrath, or repaying/requiting someone; causing something to go back upon someone.",
        "senseIdsChirho": sorted(group_hifil_repel_chirho)
    })

if group_polel_restore_chirho:
    output_chirho.append({
        "labelChirho": "to restore, refresh (Polel/Piel)",
        "descriptionChirho": "Intensive restoration — the Polel or Piel stem of שׁוּב expressing intensive or thorough restoration, as in 'he restores my soul' (Psalm 23:3).",
        "senseIdsChirho": sorted(group_polel_restore_chirho)
    })

if group_hofal_chirho:
    output_chirho.append({
        "labelChirho": "to be returned, be restored (Hofal)",
        "descriptionChirho": "Passive of the causative — the Hofal stem of שׁוּב expressing being brought back, being returned, or being restored by another agent.",
        "senseIdsChirho": sorted(group_hofal_chirho)
    })

# Write JSON output
output_path_chirho = "/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/output-chirho/merge-responses-chirho/H7725-chirho.json"

with open(output_path_chirho, "w", encoding="utf-8") as f_chirho:
    json.dump(output_chirho, f_chirho, indent=2, ensure_ascii=False)

print(f"\nJSON output written to: {output_path_chirho}")

# Print summary
print("\n=== MERGE SUMMARY ===")
total_occ_chirho = sum(info_chirho["count_chirho"] for info_chirho in senses_chirho.values())
print(f"Total occurrences: {total_occ_chirho}")
for group_chirho in output_chirho:
    label_chirho = group_chirho["labelChirho"]
    n_senses_chirho = len(group_chirho["senseIdsChirho"])
    n_occ_chirho = sum(senses_chirho[sid_chirho]["count_chirho"] for sid_chirho in group_chirho["senseIdsChirho"])
    print(f"  {label_chirho}: {n_senses_chirho} senses, {n_occ_chirho} occurrences")
