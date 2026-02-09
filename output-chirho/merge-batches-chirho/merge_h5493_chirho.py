# For God so loved the world that he gave his only begotten Son,
# that whoever believes in him should not perish but have eternal life.
# John 3:16

"""
merge_h5493_chirho.py — Merge 195 over-split senses of H5493 (סור) into real senses.

Senses based on lexicographic analysis:
1. Qal: "to turn aside, go aside" — physical deviation from path (entering, turning in)
2. Qal: "to depart, leave" — leaving a place or state
3. Qal: "to turn aside from (God/commandments/evil)" — moral departure/deviation
4. Hifil: "to remove, take away" — causative physical removal
5. Hifil: "to put away (idols/evil/garments)" — causative moral/ritual purging
6. Hophal: "to be removed" — passive removal
7. Piel: "to lead astray" — causative leading off course (rare)
8. Nominal/Adjectival: participial/adjectival uses as substantive
"""

import json

# All sense IDs from the file: 120506 through 120700
ALL_IDS_CHIRHO = list(range(120506, 120701))

# ============================================================
# SENSE ASSIGNMENTS
# ============================================================
# Each sense cluster is assigned based on:
#   - Verb stem (Qal, Hifil, Hophal, Piel)
#   - Semantic content from glosses (turn aside vs depart vs remove etc.)
#   - Context clues (moral vs physical)

# ---------------------------------------------------------------
# SENSE 1: Qal "to turn aside, go aside"
# Physical deviation from a path — turning in to visit, turning aside to see
# Key glosses: "turned aside", "turn aside", "turn in", "turned"
# ---------------------------------------------------------------
sense_1_turn_aside_chirho = [
    120506,  # Qal-Perf-3ms: "he–turned, he-turned" — physical turning
    120514,  # Qal-Perf-3ms: "turned-away, he-turned-away"
    120521,  # Qal-ConsecImperf-3m: "and–he-turned-aside, and–turned-aside" — physical entering
    120522,  # Qal-ConsecImperf-3m: "and–turned-aside" — they turned aside
    120523,  # Qal-Perf-3ms: "turned, he–turned, he-turned-aside"
    120525,  # Qal-Imperf-2mp: "turn-aside, turn–aside"
    120528,  # Qal-Perf-3ms: "turned-aside"
    120531,  # Qal-Imperf-3ms: "he-turned-aside, he-shall-turn-aside"
    120533,  # Qal-Imperf-1cp: "we-will-turn-aside"
    120537,  # Qal-Imp-ms | 3fs: "turn-aside" — entering
    120539,  # Qal-Perf-3cp: "they–turned, they-turned-aside"
    120550,  # Qal-Perf-3cp: "they–have–turned–aside"
    120552,  # Qal-Imperf-3ms: "let–him–turn–in" — physical turning in
    120553,  # Qal-ConjPerf-2mp: "and–you-turn-aside"
    120554,  # Qal-Perf-3cp: "they–turned–aside, they–turned"
    120559,  # Qal-Imperf-2ms: "you-turn-aside"
    120563,  # Qal-InfAbs: "and–turning-aside"
    120564,  # Qal-Perf-3ms: "he-turned-aside"
    120566,  # Qal-Imperf-3ms: "turns–away" (physical)
    120572,  # Qal-Inf: "turn"
    120581,  # Qal-Inf: "turning–" (departure context)
    120583,  # Qal-Imperf-3mp: "they–turn–aside"
    120587,  # Qal-Imperf-1cs: "I-turn-aside"
    120595,  # Qal-Perf-3cp: "they–have–turned–aside"
    120598,  # Qal-Perf-3cp: "they-turned-aside"
    120599,  # Qal-Imperf-1cs: "I–will–turn" (physical)
    120606,  # Qal-ConsecImperf-3m: "and–they–turned"
    120619,  # Qal-Perf-1cs: "I–have–turned"
    120621,  # Qal-Imp-mp: "turn–aside" — hospitality/entering context
    120622,  # Qal-Imperf-2mp: "you–shall–turn"
    120631,  # Qal-Inf: "turn"
    120634,  # Qal-Perf-2mp: "you–had–turned–aside"
    120635,  # Qal-Imperf-3ms: "will–turn–aside"
    120640,  # Qal-ConjPerf-2mp: "and–turn–aside"
    120643,  # Qal-Imp-ms | 3fs: "turn-aside"
    120645,  # Qal-Inf: "turn-aside"
    120647,  # Qal-ConsecImperf-3m: "and–turned-aside"
    120655,  # Qal-Imperf.Cohort-1cs: "I-will-turn-aside–"
    120657,  # Qal-Imperf-3ms: "shall-turn-aside"
    120667,  # Qal-Imp-mp: "Turn–aside"
    120668,  # Qal-Imp-mp: "turn-aside"
    120674,  # Qal-Imperf-2ms: "turn-aside"
    120675,  # Qal-ConjImperf.Coho: "and–let-us-turn-aside"
    120691,  # Qal-Perf-3ms: "turned-away" (bhaTkaa — went astray)
    120692,  # Qal-Perf-3ms: "have–turned–aside" — moral but Qal sense 3
    120694,  # Qal-Imperf-3fs: "turns-aside"
    120696,  # Qal-Perf-3cp: "they-turned-aside"
    120700,  # Qal-ConsecImperf-3m: "and–they–turned"
]

# ---------------------------------------------------------------
# SENSE 2: Qal "to depart, leave"
# Leaving a place, going away — glosses: "depart", "departed", "leave"
# ---------------------------------------------------------------
sense_2_depart_chirho = [
    120509,  # Qal-Imp-mp: "depart, Depart"
    120515,  # Qal-Perf-3cp: "they–departed"
    120518,  # Qal-Inf: "turning–away, is–to–turn–away" — departure
    120519,  # Qal-Imperf-3ms: "will-turn-away, depart"
    120526,  # Qal-Imp-mp: "depart, turn-away"
    120529,  # Qal-Imp-ms: "depart"
    120530,  # Qal-Perf-2mp: "you–have–turned–aside, have–turned–aside" — moral departure
    120534,  # Qal-Inf: "to–turn–away"
    120536,  # Qal-Imperf-3ms/3fs: "will–depart"
    120541,  # Qal-ConjPerf-3fs/3ms: "and–will-turn-away"
    120545,  # Qal-Perf-3ms: "departed"
    120547,  # Qal-ConjPerf-3cp/3ms: "and–will–depart"
    120560,  # Qal-Perf-3ms/3fs: "departed"
    120561,  # Qal-Inf: "to–turn–aside"
    120574,  # Qal-Imperf-3ms: "will–depart"
    120585,  # Qal-Perf-3ms: "had–departed"
    120586,  # Qal-Imperf-3fs: "will–depart"
    120588,  # Qal-Inf: "to–turn"
    120589,  # Qal-Perf-3ms: "departed"
    120592,  # Qal-Imperf-3ms: "he–will–depart"
    120614,  # Qal-ConjPerf-3ms: "and–departs"
    120616,  # Qal-Imperf-3ms: "will–depart"
    120624,  # Qal-Imp-mp: "depart"
    120627,  # Qal-Imp-ms: "and–turn–away"
    120633,  # Qal-ConjImperf-3ms: "and–he-departs"
    120636,  # Qal-ConjPerf-3fs: "and–shall-depart"
    120644,  # Qal-Prtcpl-ms: "and–one–departing"
    120648,  # Qal-ConjPerf-3ms: "and–it-will-depart"
    120656,  # Qal-ConsecImperf-3m: "and–removed" — contextually departure
    120660,  # Qal-ConjPerf-3ms: "and–will–depart"
    120665,  # Qal-ConsecImperf-3m: "and–he-turned-aside" — departed context
    120670,  # Qal-Perf-3cp: "they–turned–away"
    120672,  # Qal-Inf: "and–to-turn-away"
    120673,  # Qal-Imperf-3mp: "they–depart"
    120678,  # Qal-ConjPerf-3ms: "and–turns-away"
    120684,  # Qal-Perf-3cp: "they-departed"
    120686,  # Qal-ConjPerf-3fs: "and–departed"
    120687,  # Qal-Imp-ms: "turn–aside" — departure imperative
    120690,  # Qal-Imperf-3ms: "he-departs"
    120693,  # Qal-ConsecImperf-3m: "and–departed"
    120695,  # Qal-Perf-3ms: "departed"
    120641,  # Qal-Perf-3ms: "Has–turned–aside" — departed
    120698,  # Qal-Inf: "when–I-depart"
]

# ---------------------------------------------------------------
# SENSE 3: Qal "to turn aside from (God/evil)" — moral/spiritual departure
# Participial forms about moral conduct: "turning away from evil"
# ---------------------------------------------------------------
sense_3_moral_departure_chirho = [
    120513,  # Qal-Prtcpl-ms: "and–turning–away, and–turns–away" — moral
    120516,  # Qal-Perf-3cp: "were–removed, departed" — moral consequences
    120532,  # Qal-Imp-ms: "turn" — from evil context
    120664,  # Qal-Prtcpl-fsc: "but–lacking" — moral deviation
    120677,  # Qal-Prtcpl-ms: "and–turning–aside" — moral context
    120680,  # Qal-Imperf-3mp: "they-shall-be-removed" — moral/passive Qal
]

# ---------------------------------------------------------------
# SENSE 4: Hifil "to remove, take away" — causative physical removal
# Key glosses: "removed", "remove", "shall remove", "take away"
# ---------------------------------------------------------------
sense_4_remove_chirho = [
    120507,  # Hifil-Imperf-3ms: "he-shall-remove–it"
    120508,  # Hifil-Perf-3ms: "removed"
    120510,  # Hifil-ConsecImperf: "and–removed, and–he-removed"
    120511,  # Hifil-ConsecImperf/Qal: "and–removed" — primarily Hifil removal
    120512,  # Hifil-ConjPerf-1cs: "and–I–will–remove"
    120517,  # Hifil-Perf-3ms/3cp: "they–removed, removed"
    120524,  # Hifil-ConjPerf-3cp: "and–they-shall-remove"
    120535,  # Hifil-Perf-3ms: "has–removed, He-removed"
    120538,  # Hifil-Prtcpl-ms: "removing" — active removal
    120540,  # Hifil-ConsecImperf: "and–they–removed"
    120542,  # Hifil-Perf/Imperf-3ms: "he-removes, He–shall–remove"
    120543,  # Hifil-Inf: "to–remove"
    120544,  # Hifil-ConjImperf.Ju: "and–let–him–remove"
    120546,  # Hifil-ConjPerf-1cs: "and–I-will-remove"
    120548,  # Hifil-ConsecImperf: "and–they-removed"
    120555,  # Hifil-Imperf-3ms: "he-shall-remove"
    120556,  # Hifil-Perf-1cs: "I–removed"
    120558,  # Hifil-Imperf-2ms: "you–remove"
    120565,  # Hifil-ConjImperf-1c: "and–I-removed"
    120567,  # Hifil-Inf | 2mp: "you–remove"
    120569,  # Hifil-ConsecImperf: "and–he–removed–him" — removing a person
    120571,  # Hifil-InfAbs: "remove"
    120573,  # Hifil-ConsecImperf: "and–I-removed"
    120576,  # Hifil-Perf-3ms: "He–takes–back"
    120578,  # Hifil-Imperf-1cs: "I-will-remove"
    120579,  # Hifil-ConjPerf-3fs: "and–she-shall-remove"
    120580,  # Hifil-ConsecImperf: "and–removed–him"
    120591,  # Hifil-ConsecImperf: "and–he-removed-them"
    120593,  # Hifil-Imperf-3mp: "they-turn-aside" — Hifil = they remove
    120594,  # Hifil-Inf | 3fs: "to–remove–it"
    120597,  # Hifil-Perf-3ms: "has–taken–away"
    120601,  # Hifil-ConjImperf.Ju: "and–let–him–remove"
    120602,  # Hifil-ConsecImperf: "and–he–removed–her"
    120603,  # Hifil-ConjPerf-3ms: "and–will–remove"
    120604,  # Hifil-ConsecImperf: "and–He–has–removed"
    120605,  # Hifil-Imperf-3ms: "he–will–turn" — causative turning
    120607,  # Hifil-ConjImperf-3m: "and–are–removed" — Hifil removal
    120609,  # Hifil-Imperf-3ms: "will–remove"
    120610,  # Hifil-ConjImperf.Co: "and–let–me–remove"
    120612,  # Hifil-Perf-3ms | 3fs: "removed-her"
    120613,  # Hifil-Imperf-3ms: "he-would-remove"
    120615,  # Hifil-Imperf-3mp: "they-shall-remove"
    120617,  # Hifil-Prtcpl-ms: "is–removing"
    120618,  # Hifil-Perf-3ms | 2ms: "you–remove"
    120620,  # Hifil-Inf: "to–remove"
    120623,  # Hifil-Inf: "to–turn–aside" — Hifil = causative removal/moving
    120638,  # Hifil-ConsecImperf: "and–removed"
    120639,  # Hifil-ConjImperf.Co: "and–I-would-remove"
    120646,  # Hifil-ConsecImperf: "and–they–removed"
    120649,  # Hifil-ConjPerf-3ms: "and–takes–away"
    120650,  # Hifil-Perf-3ms: "turned–aside" — trasladó=transferred
    120651,  # Hifil-InfAbs: "removing"
    120653,  # Hifil-Imp-ms: "remove"
    120654,  # Hifil-ConjImperf.Co: "and–I–will–remove"
    120658,  # Hifil-Imp-ms: "remove"
    120659,  # Hifil-ConjPerf-2ms: "and–you–shall–remove"
    120661,  # Hifil-Perf-1cs: "I–removed–it"
    120662,  # Hifil-Imperf-1cs: "I–will–remove"
    120666,  # Hifil-Imperf.Jus-3ms: "let-Him-turn-aside" — let him remove
    120669,  # Hifil-Imperf-1cs: "I-will-remove"
    120671,  # Hifil-ConjPerf-3ms: "and–he-shall-remove"
    120676,  # Hifil-ConsecImperf: "and–removed"
    120679,  # Hifil-ConjPerf-1cs: "and–I–will–take–off"
    120681,  # Hifil-Inf: "to–remove"
    120682,  # Hifil-Perf-1cs: "I–removed"
    120683,  # Hifil-Inf: "of–removing"
    120685,  # Hifil-Perf-3ms: "he-turned-aside" — Hifil = removed
    120688,  # Hifil-Inf: "to–turn–aside" — Hifil = to remove
    120689,  # Hifil-ConsecImperf: "and–removed–them"
    120697,  # Hifil-Imperf-1cs: "I–will–remove"
    120699,  # Hifil-Perf-1cs: "I-removed"
]

# ---------------------------------------------------------------
# SENSE 5: Hifil "to put away (idols/evil/garments)" — moral purging
# Key glosses: "put away", garment removal, idols removal
# ---------------------------------------------------------------
sense_5_put_away_chirho = [
    120520,  # Hifil-Imp-mp: "remove" — put away (idols context)
    120527,  # Hifil-ConsecImperf: "and–removed" — garment removal (utaarī/벗었다)
    120549,  # Hifil-ConsecImperf: "and–removed" — garment removal (utaarī/벗었다)
    120551,  # Hifil-Imp-mp: "remove" — put away
    120562,  # Hifil-Imp-ms: "turn–away, put–away"
    120568,  # Hifil-Imp-fs: "put-away" — feminine imperative
    120570,  # Hifil-Perf-3ms: "has–turned–away" — turned away wrath
    120577,  # Hifil-Imp-ms: "and–remove" — moral purging
    120582,  # Hifil-Imperf-3ms: "he–will–turn–aside" — causing to turn
    120590,  # Hifil-Prtcpl-ms: "one–who–turns–away" — one who diverts
    120596,  # Hifil-Imperf-1cs: "I–put–away"
    120611,  # Hifil-Imp-mp: "and–remove" — put away
    120625,  # Hifil-Inf: "and–to–remove" — garment context (gunia)
    120626,  # Hifil-Imp-ms: "remove" — Aparta context
    120629,  # Hifil-ConjImperf.Ju: "and–let–her–put–away"
    120630,  # Hifil-Imp-ms: "remove" — Aparta
    120632,  # Hifil-Imp-mp: "put–away" — kusafisha=cleanse
    120637,  # Hifil-Inf: "remove" — garment (벗겨라)
    120652,  # Hifil-Imp-mp: "and–remove"
    120663,  # Hifil-Imp-mp: "remove" — garments (벗기라/utarō)
]

# ---------------------------------------------------------------
# SENSE 6: Hophal "to be removed" — passive removal
# ---------------------------------------------------------------
sense_6_passive_chirho = [
    120557,  # Hofal-Perf/Imperf-3ms: "was-removed, is-removed"
    120575,  # Hofal-Perf-3ms: "is-removed"
    120584,  # Hofal-Prtcpl-ms: "is-removed"
]

# ---------------------------------------------------------------
# SENSE 7: Piel "to lead astray" (rare)
# ---------------------------------------------------------------
sense_7_lead_astray_chirho = [
    120600,  # Piel-Perf-3ms: "He–led–astray"
]

# ---------------------------------------------------------------
# SENSE 8: Nominal/Adjectival use
# ---------------------------------------------------------------
sense_8_nominal_chirho = [
    120608,  # N-ms: "the–removed"
    120628,  # Qal-Prtcpl-mpc: "rebels–of" — substantival participle
    120642,  # Adj-fs: "and–put-aside" — adjectival
]

# ============================================================
# BUILD OUTPUT
# ============================================================
output_chirho = [
    {
        "labelChirho": "turn aside, go aside (Qal)",
        "descriptionChirho": "Qal stem: to turn aside physically from a path or road, to turn in to visit or enter a place — physical deviation or diversion.",
        "senseIdsChirho": sorted(sense_1_turn_aside_chirho)
    },
    {
        "labelChirho": "depart, leave (Qal)",
        "descriptionChirho": "Qal stem: to depart from a place or person, to go away, to leave — movement away from a location or state.",
        "senseIdsChirho": sorted(sense_2_depart_chirho)
    },
    {
        "labelChirho": "turn aside morally (Qal)",
        "descriptionChirho": "Qal stem: to turn aside from God, from commandments, or from evil — moral or spiritual deviation, often with participial forms describing character.",
        "senseIdsChirho": sorted(sense_3_moral_departure_chirho)
    },
    {
        "labelChirho": "remove, take away (Hifil)",
        "descriptionChirho": "Hifil stem: to remove or take away physically — causative removal of objects, persons, or structures from their place.",
        "senseIdsChirho": sorted(sense_4_remove_chirho)
    },
    {
        "labelChirho": "put away, purge (Hifil)",
        "descriptionChirho": "Hifil stem: to put away idols, evil, or garments — causative moral or ritual purging, including removing clothing or foreign gods.",
        "senseIdsChirho": sorted(sense_5_put_away_chirho)
    },
    {
        "labelChirho": "be removed (Hophal)",
        "descriptionChirho": "Hophal stem: to be removed, to be taken away — passive of the Hifil, indicating something has been removed by an external agent.",
        "senseIdsChirho": sorted(sense_6_passive_chirho)
    },
    {
        "labelChirho": "lead astray (Piel)",
        "descriptionChirho": "Piel stem: to lead astray, to cause to deviate — intensive causative of leading someone off the correct path.",
        "senseIdsChirho": sorted(sense_7_lead_astray_chirho)
    },
    {
        "labelChirho": "one removed, rebel (nominal)",
        "descriptionChirho": "Nominal or adjectival usage: a removed or set-aside one, a rebel or deviant — substantival participle or adjective denoting a person or thing that has turned aside.",
        "senseIdsChirho": sorted(sense_8_nominal_chirho)
    },
]

# ============================================================
# VERIFICATION
# ============================================================
all_assigned_chirho = []
for sense_chirho in output_chirho:
    all_assigned_chirho.extend(sense_chirho["senseIdsChirho"])

all_assigned_set_chirho = set(all_assigned_chirho)
all_expected_set_chirho = set(ALL_IDS_CHIRHO)

# Check for duplicates
if len(all_assigned_chirho) != len(all_assigned_set_chirho):
    duplicates_chirho = [id_chirho for id_chirho in all_assigned_chirho
                         if all_assigned_chirho.count(id_chirho) > 1]
    print(f"ERROR: Duplicate IDs found: {set(duplicates_chirho)}")
    raise SystemExit(1)

# Check for missing
missing_chirho = all_expected_set_chirho - all_assigned_set_chirho
if missing_chirho:
    print(f"ERROR: Missing IDs: {sorted(missing_chirho)}")
    raise SystemExit(1)

# Check for extras
extra_chirho = all_assigned_set_chirho - all_expected_set_chirho
if extra_chirho:
    print(f"ERROR: Extra IDs not in expected range: {sorted(extra_chirho)}")
    raise SystemExit(1)

# Check total
total_chirho = sum(len(s_chirho["senseIdsChirho"]) for s_chirho in output_chirho)
assert total_chirho == 195, f"Expected 195 IDs, got {total_chirho}"

print(f"Verification passed: {total_chirho} sense IDs assigned across {len(output_chirho)} merged senses.")
for s_chirho in output_chirho:
    print(f"  {s_chirho['labelChirho']}: {len(s_chirho['senseIdsChirho'])} clusters")

# ============================================================
# WRITE OUTPUT
# ============================================================
output_path_chirho = "/Volumes/ENC_4TB_WDB_CHIRHO/dev-aleluya/friends-aleluya/andrewbeth-chirho/semantic-chirho/output-chirho/merge-responses-chirho/H5493-chirho.json"

with open(output_path_chirho, "w", encoding="utf-8") as f_chirho:
    json.dump(output_chirho, f_chirho, indent=2, ensure_ascii=False)

print(f"\nOutput written to: {output_path_chirho}")
