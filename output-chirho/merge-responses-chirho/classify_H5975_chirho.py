# For God so loved the world that he gave his only begotten Son,
# that whoever believes in him should not perish but have eternal life. John 3:16

"""
classify_H5975_chirho.py — Merge 224 over-split senses of H5975 (עמד) into real senses.

Refined classification: uses explicit ID sets for stop/endure/serve to avoid
keyword false positives, with keyword matching only for clear, unambiguous terms.
"""

import re
import json
import sys

PROMPT_PATH_CHIRHO = "/Volumes/ENC_4TB_WDB_CHIRHO/dev-aleluya/friends-aleluya/andrewbeth-chirho/semantic-chirho/output-chirho/merge-batches-chirho/prompt-H5975-chirho.txt"
OUTPUT_PATH_CHIRHO = "/Volumes/ENC_4TB_WDB_CHIRHO/dev-aleluya/friends-aleluya/andrewbeth-chirho/semantic-chirho/output-chirho/merge-responses-chirho/H5975-chirho.json"


def parse_senses_chirho(path_chirho: str) -> list:
    """Parse every sense block from the prompt file."""
    with open(path_chirho, "r", encoding="utf-8") as f_chirho:
        text_chirho = f_chirho.read()

    pattern_chirho = re.compile(
        r"### Sense (\d+) \((\d+) occurrences?\)\s*\n"
        r"Grammar: (.+?)\n"
        r"((?:  \w{3}: .+\n)*)",
        re.MULTILINE,
    )

    senses_chirho = []
    for m_chirho in pattern_chirho.finditer(text_chirho):
        sense_id_chirho = int(m_chirho.group(1))
        count_chirho = int(m_chirho.group(2))
        grammar_chirho = m_chirho.group(3).strip()
        gloss_block_chirho = m_chirho.group(4)

        glosses_chirho = {}
        for line_chirho in gloss_block_chirho.strip().split("\n"):
            line_chirho = line_chirho.strip()
            if ": " in line_chirho:
                lang_chirho, val_chirho = line_chirho.split(": ", 1)
                glosses_chirho[lang_chirho.strip()] = val_chirho.strip()

        senses_chirho.append({
            "id_chirho": sense_id_chirho,
            "count_chirho": count_chirho,
            "grammar_chirho": grammar_chirho,
            "glosses_chirho": glosses_chirho,
        })

    return senses_chirho


def classify_sense_chirho(sense_chirho: dict) -> str:
    """
    Classify a sense into one of the merged groups.

    Groups:
      1. "qal_stand"     — Qal: physical standing (default Qal)
      2. "qal_stop"      — Qal: stand still, stop, cease
      3. "qal_endure"    — Qal: stand firm, endure, persist, remain
      4. "qal_serve"     — Qal: serve, attend (stand before)
      5. "hifil_erect"   — Hifil: set up, erect, establish, confirm
      6. "hifil_station" — Hifil: station, appoint (place a person)
      7. "hofal_passive"  — Hofal: be stood, be made to stand
    """
    grammar_chirho = sense_chirho["grammar_chirho"]
    sid_chirho = sense_chirho["id_chirho"]

    # --- Hofal (passive of Hifil) ---
    if "Hofal" in grammar_chirho:
        return "hofal_passive"

    # --- Hifil stem ---
    if "Hifil" in grammar_chirho:
        # Explicit set: "station/appoint" = placing persons in positions
        station_ids_chirho = {
            124655,  # and–stationed, and–he–stationed, and–he–appointed
            124666,  # and–they-set-up, and–stationed, and–appointed
            124679,  # and–I-stationed, and–I–set–up
            124688,  # appointed
            124691,  # and–stood (Hifil causative — made someone stand)
            124695,  # and–stood–him, and–he-stood-him
            124684,  # and–it-set-me, and–he-made-me-stand
            124714,  # and–I–appointed
            124731,  # and–set–them, and–set-up–them
            124737,  # I–raised–you–up (Ex 9:16, God stations Pharaoh)
            124739,  # and–we-set
            124751,  # and–set-it (Hifil Imp + 3fs suffix)
            124768,  # and–station (Hifil InfAbs)
            124778,  # he-appointed
            124803,  # you–have–appointed
            124812,  # and–appointed
            124815,  # I–had–set–up (set guards/positions)
            124820,  # and–I–set–them
            124838,  # to–appoint
            124847,  # propping-himself-up (Hifil ptcpl reflexive)
            124863,  # I–stationed
            124867,  # and–you-shall-stand (Hifil = station someone)
            124873,  # station (imperative)
        }

        if sid_chirho in station_ids_chirho:
            return "hifil_station"
        else:
            return "hifil_erect"

    # --- Qal / nominal forms ---
    # Use explicit ID sets for stop, endure, serve to avoid keyword false positives.

    # ===== "stand still / stop / cease" =====
    # These are identified by: English "stood still", "stop(ped)", "cease(d)", "delay",
    # "stayed-behind"; Spanish "se detuvo/detuvieron", "cesó"; Korean "멈추/멈쳤/그쳤";
    # Hindi "ठहरा/ठहरे/रुक/थमा"; or contextual reading of the passage.
    stop_ids_chirho = {
        124674,  # and–stood, and–stood–still — spa: "y–se–detuvo"
        124675,  # and–stood — spa: "y–se–detuvieron" — stood still in place
        124677,  # stop, stand — spa: "¡Deteneos!" = Stop!
        124682,  # stood — spa: "se–detuvieron, se-pararon" = stopped; hin: "रुके"
        124694,  # they-stood — spa: "se–paraban, se–detenían" = they would stop
        124700,  # and–it–stood — spa: "y–se–detuvo"
        124703,  # they–stand, they-stood — spa: "se–detuvieron"
        124713,  # stand — spa: "se–detengan" = stop yourselves
        124720,  # and–they–stood, and–stood — spa: "y–se–detuvieron"
        124721,  # and–they–stood–still, and–stood–still
        124723,  # has-stood — spa: "se-detuvo"; kor: "멈추면"
        124725,  # it-stands — spa: "se-detiene"
        124742,  # stopped
        124743,  # she-ceased — spa: "cesó"
        124749,  # when–standing-of-them — spa: "al–detenerse–ellos"
        124756,  # and–they–stood — spa: "y–se–detuvieron"
        124791,  # delay — spa: "te–detengas"
        124795,  # it–stood — spa: "Se–detuvo"; kor: "멈춰–서다"
        124807,  # and–standing — spa: "y–se–paró"; kor: "멈춘다"
        124818,  # stand — spa: "te–detengas"
        124822,  # stand–still — spa: "os–detengáis"
        124832,  # and–in–standing-of-them — spa: "y–al–detenerse–ellos"
        124835,  # and–stood — spa: "y–cesó"; kor: "그쳤다"
        124836,  # and–he–stopped
        124840,  # stands — spa: "se–detuvo"
        124850,  # and–stayed-behind — spa: "y–se–detuvieron"
        124854,  # stand — spa: "te–detengas"
        124866,  # and–stopped — spa: "Y–se-detuvo"; kor: "멈췄다"
        124874,  # and–they-shall-stand — spa: "y–se–detendrán"
    }

    # ===== "stand firm / endure / persist / remain" =====
    # Identified by: English "endure", "remain", "persist", "firm", "can stand";
    # Spanish "permanece/permanecerá/resistirá/mantendrá"; Arabic يَثْبُتُ/بَاقِيَةٌ/بَقِيَ/صَمَدَ;
    # Korean "견디/머물"; or contextual reading.
    endure_ids_chirho = {
        124658,  # shall-stand — spa: "permanecerá, se–mantendrá"; arb: "يَصْمُدُ"
        124662,  # and–shall-stand — spa: "y–se–establecerá"; arb: "وَ–يَقُومُ" — prophetic "will stand firm"
        124667,  # stands — spa: "permanece"; arb: "قائِم, تَثْبُتُ"
        124668,  # can–stand, will–stand — spa: "se–mantendrá"; arb: "يَقِفُ"
        124680,  # can–stand, could–stand — spa: "resistirá"
        124681,  # standing, stands — spa: "permanece"; hin: "बनी–रहती–है"
        124706,  # you–will–stand — spa: "estarás" — in context of "stand firm"
        124708,  # will–stand, shall-stand — spa: "resistirán"; arb: "تَصْمُدُ"
        124715,  # will–stand — spa: "permanecerá"
        # 124725 is in stop_ids (spa: "se-detiene" = stops), not here.
        124732,  # and–will–stand — spa: "Y–se–levantarán" — future standing firm in prophecy
        124735,  # stands — spa: "permanece"
        124738,  # would-stand — spa: "si–permanecerían"; arb: "هَلْ–تَثْبُتُ"; hin: "क्या–टिकेंगी"
        124747,  # enduring — spa: "que–permanece"; arb: "بَاقِيَةٌ"
        124748,  # remains — spa: "permaneció"; arb: "بَقِيَ"
        124750,  # and–it–stood — spa: "y–permaneció"; arb: "فَثَبَتَ" (it stood firm/remained)
        124766,  # can-stand — spa: "nos–mantendremos"
        124769,  # they–stand — spa: "permanecen"
        124770,  # shall–stand — spa: "se–mantendrá–en–pie"
        124779,  # they-stood — spa: "se–mantuvieron" (they stood firm)
        124788,  # he-stands — spa: "permanece"; arb: "بَقِيَ"; kor: "견디면"
        124792,  # and–it–stands — spa: "y–permanece"; arb: "وَ–تَثْبُتُ"
        124804,  # standing (ptcpl-mp) — spa: "permanecen"; arb: "قَائِمَةٌ"
        124805,  # they–had–stood — spa: "hubieran–estado" (counterfactual persistence)
        124809,  # stood (perf-3fs) — spa: "permaneció"
        124828,  # they–will–stand — spa: "permanezcan"; arb: "تَبْقَى"
        124831,  # he–stayed — spa: "permaneció"; hin: "रुका"
        124837,  # it–stood (perf-3fs) — spa: "permanecía"
        124839,  # it-stands — spa: "permanecerá;"; arb: "يَثْبُتُ"
        124858,  # stands — spa: "se–mantendrá"
        124864,  # will–stand — spa: "¿Soportará"; arb: "هَلْ–يَثْبُتُ"; kor: "견디겠느냐"
        124865,  # to–stand — spa: "permanecer"; kor: "견디기를"
        124872,  # will–endure — spa: "permanecerás"; arb: "تَبقى"
    }

    # ===== "serve / attend" =====
    # Standing before a king/God in service. Identified by hin: "सेवा" or contextual
    # "the ones standing [before the LORD]" = ministers/attendants.
    serve_ids_chirho = {
        124656,  # the–ones–standing — hin: "जो–सेवा–करते–थे" = "who served"
        124697,  # to–stand — swa: "kutumika" (to serve)
        124733,  # who–stand, the–ones–standing — "who stand before..." = attend
    }

    if sid_chirho in stop_ids_chirho:
        return "qal_stop"
    if sid_chirho in endure_ids_chirho:
        return "qal_endure"
    if sid_chirho in serve_ids_chirho:
        return "qal_serve"

    # Additional keyword-only catches for anything missed by the explicit sets:
    eng_chirho = sense_chirho["glosses_chirho"].get("eng", "").lower()

    if "endur" in eng_chirho:
        return "qal_endure"
    if eng_chirho.startswith("stop") or "ceased" in eng_chirho:
        return "qal_stop"

    # --- Default: physical standing ---
    return "qal_stand"


def main_chirho():
    senses_chirho = parse_senses_chirho(PROMPT_PATH_CHIRHO)
    print(f"Parsed {len(senses_chirho)} senses from prompt file.")

    all_ids_chirho = {s_chirho["id_chirho"] for s_chirho in senses_chirho}
    print(f"Unique sense IDs: {len(all_ids_chirho)}")

    if len(all_ids_chirho) != 224:
        print(f"WARNING: Expected 224 senses, got {len(all_ids_chirho)}")

    # Classify each sense
    groups_chirho = {
        "qal_stand": [],
        "qal_stop": [],
        "qal_endure": [],
        "qal_serve": [],
        "hifil_erect": [],
        "hifil_station": [],
        "hofal_passive": [],
    }

    for sense_chirho in senses_chirho:
        group_chirho = classify_sense_chirho(sense_chirho)
        groups_chirho[group_chirho].append(sense_chirho["id_chirho"])

    # Verify completeness — every ID in exactly one group
    assigned_ids_chirho = set()
    for group_chirho, ids_chirho in groups_chirho.items():
        for id_chirho in ids_chirho:
            if id_chirho in assigned_ids_chirho:
                print(f"ERROR: ID {id_chirho} assigned to multiple groups!")
                sys.exit(1)
            assigned_ids_chirho.add(id_chirho)

    missing_chirho = all_ids_chirho - assigned_ids_chirho
    extra_chirho = assigned_ids_chirho - all_ids_chirho

    if missing_chirho:
        print(f"ERROR: Missing IDs: {sorted(missing_chirho)}")
        sys.exit(1)
    if extra_chirho:
        print(f"ERROR: Extra IDs not in source: {sorted(extra_chirho)}")
        sys.exit(1)

    total_assigned_chirho = sum(len(v_chirho) for v_chirho in groups_chirho.values())
    print(f"Total assigned: {total_assigned_chirho}")
    print()

    for group_chirho, ids_chirho in groups_chirho.items():
        print(f"  {group_chirho}: {len(ids_chirho)} senses")

    # Build output JSON
    output_chirho = [
        {
            "labelChirho": "to stand, stand up",
            "descriptionChirho": "Qal: physical standing, taking a standing position, being in a standing posture — the basic, unmarked sense of עמד covering all Qal inflections where the meaning is simply positional standing.",
            "senseIdsChirho": sorted(groups_chirho["qal_stand"]),
        },
        {
            "labelChirho": "to stand still, stop",
            "descriptionChirho": "Qal: cessation of motion — standing still, stopping, halting, ceasing movement or activity.",
            "senseIdsChirho": sorted(groups_chirho["qal_stop"]),
        },
        {
            "labelChirho": "to stand firm, endure",
            "descriptionChirho": "Qal: metaphorical steadfastness — standing firm, enduring, persisting, remaining, withstanding opposition or the passage of time.",
            "senseIdsChirho": sorted(groups_chirho["qal_endure"]),
        },
        {
            "labelChirho": "to serve, attend",
            "descriptionChirho": "Qal: standing before a king or God in service — attending, ministering, serving in an official or liturgical capacity.",
            "senseIdsChirho": sorted(groups_chirho["qal_serve"]),
        },
        {
            "labelChirho": "to set up, establish",
            "descriptionChirho": "Hifil: causative erection or establishment — setting up, erecting, establishing, confirming, raising up an object, institution, or decree.",
            "senseIdsChirho": sorted(groups_chirho["hifil_erect"]),
        },
        {
            "labelChirho": "to station, appoint",
            "descriptionChirho": "Hifil: placing or positioning a person — stationing, appointing, setting someone in a role or physical position.",
            "senseIdsChirho": sorted(groups_chirho["hifil_station"]),
        },
        {
            "labelChirho": "to be made to stand",
            "descriptionChirho": "Hofal (passive): being caused to stand, being set up or stationed by another — the passive counterpart of the Hifil.",
            "senseIdsChirho": sorted(groups_chirho["hofal_passive"]),
        },
    ]

    # Remove empty groups
    output_chirho = [g_chirho for g_chirho in output_chirho if g_chirho["senseIdsChirho"]]

    with open(OUTPUT_PATH_CHIRHO, "w", encoding="utf-8") as f_chirho:
        json.dump(output_chirho, f_chirho, ensure_ascii=False, indent=2)

    print(f"\nWrote {len(output_chirho)} merged senses to {OUTPUT_PATH_CHIRHO}")

    # Print occurrence totals per group
    id_to_count_chirho = {}
    for s_chirho in senses_chirho:
        id_to_count_chirho[s_chirho["id_chirho"]] = s_chirho["count_chirho"]

    print("\nOccurrence distribution:")
    total_occ_chirho = 0
    for g_chirho in output_chirho:
        occ_chirho = sum(id_to_count_chirho.get(i_chirho, 0) for i_chirho in g_chirho["senseIdsChirho"])
        total_occ_chirho += occ_chirho
        print(f"  {g_chirho['labelChirho']}: {len(g_chirho['senseIdsChirho'])} clusters, {occ_chirho} occurrences")
    print(f"  TOTAL: {total_occ_chirho} occurrences")

    print("\nDONE — all 224 IDs accounted for.")


if __name__ == "__main__":
    main_chirho()
