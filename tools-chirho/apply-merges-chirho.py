# For God so loved the world that he gave his only begotten Son,
# that whoever believes in him should not perish but have eternal life.

"""
apply-merges-chirho.py

Reads LLM merge-response JSON files from output-chirho/merge-responses-chirho/
and applies them to the SQLite database at data-chirho/semantic-chirho.db.

For each merged sense group:
  - The FIRST sense_id becomes the canonical sense
  - Its label_chirho and description_chirho are updated
  - All other sense_ids' assignments are re-pointed to the canonical one
  - Those other senses are deleted from sense_chirho

Skips lemmas already recorded in the progress JSONL file.
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone


# ----- paths -----
BASE_DIR_CHIRHO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_PATH_CHIRHO = os.path.join(BASE_DIR_CHIRHO, "data-chirho", "semantic-chirho.db")
RESPONSE_DIR_CHIRHO = os.path.join(
    BASE_DIR_CHIRHO, "output-chirho", "merge-responses-chirho"
)
PROGRESS_PATH_CHIRHO = os.path.join(RESPONSE_DIR_CHIRHO, "progress-chirho.jsonl")


def load_done_lemmas_chirho() -> set[str]:
    """Return the set of lemma IDs already recorded in the progress file."""
    done_chirho: set[str] = set()
    if not os.path.exists(PROGRESS_PATH_CHIRHO):
        return done_chirho
    with open(PROGRESS_PATH_CHIRHO, "r", encoding="utf-8") as fh_chirho:
        for line_chirho in fh_chirho:
            line_chirho = line_chirho.strip()
            if line_chirho:
                try:
                    rec_chirho = json.loads(line_chirho)
                    done_chirho.add(rec_chirho["lemmaIdChirho"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return done_chirho


def collect_pending_files_chirho(
    done_chirho: set[str],
) -> list[tuple[str, str]]:
    """Return sorted list of (lemma_id, filepath) for files not yet applied."""
    pending_chirho: list[tuple[str, str]] = []
    for fn_chirho in sorted(os.listdir(RESPONSE_DIR_CHIRHO)):
        if not fn_chirho.endswith("-chirho.json"):
            continue
        lemma_id_chirho = fn_chirho.replace("-chirho.json", "")
        if lemma_id_chirho in done_chirho:
            continue
        full_path_chirho = os.path.join(RESPONSE_DIR_CHIRHO, fn_chirho)
        pending_chirho.append((lemma_id_chirho, full_path_chirho))
    return pending_chirho


def apply_one_lemma_chirho(
    conn_chirho: sqlite3.Connection,
    lemma_id_chirho: str,
    file_path_chirho: str,
) -> tuple[int, int, int]:
    """
    Apply a single merge-response JSON file.

    Returns (groups_kept_chirho, senses_merged_chirho, senses_updated_chirho).
      - groups_kept_chirho: number of canonical senses kept (== number of groups)
      - senses_merged_chirho: number of non-canonical senses deleted
      - senses_updated_chirho: number of sense_assignment rows re-pointed
    """
    with open(file_path_chirho, "r", encoding="utf-8") as fh_chirho:
        raw_chirho = fh_chirho.read()

    # Some files may have extra text around the JSON array; extract it
    json_match_chirho = None
    try:
        groups_chirho = json.loads(raw_chirho)
        json_match_chirho = True
    except json.JSONDecodeError:
        # Try to extract the first JSON array from the text
        import re

        match_chirho = re.search(r"\[[\s\S]*\]", raw_chirho)
        if match_chirho:
            groups_chirho = json.loads(match_chirho.group(0))
            json_match_chirho = True

    if not json_match_chirho:
        print(f"  ERROR: Could not parse JSON for {lemma_id_chirho}", file=sys.stderr)
        return (0, 0, 0)

    cur_chirho = conn_chirho.cursor()
    groups_kept_chirho = 0
    senses_merged_chirho = 0
    senses_updated_chirho = 0

    for group_chirho in groups_chirho:
        label_chirho = group_chirho.get("labelChirho", "")
        description_chirho = group_chirho.get("descriptionChirho", "")
        sense_ids_chirho: list[int] = group_chirho.get("senseIdsChirho", [])

        if not sense_ids_chirho:
            continue

        canonical_id_chirho = sense_ids_chirho[0]
        source_ids_chirho = sense_ids_chirho[1:]

        # Verify the canonical sense exists
        cur_chirho.execute(
            "SELECT COUNT(*) FROM sense_chirho WHERE sense_id_chirho = ?",
            (canonical_id_chirho,),
        )
        if cur_chirho.fetchone()[0] == 0:
            print(
                f"  WARNING: canonical sense {canonical_id_chirho} not found for "
                f"{lemma_id_chirho}, skipping group '{label_chirho}'",
                file=sys.stderr,
            )
            continue

        # Update canonical sense with new label and description
        cur_chirho.execute(
            """UPDATE sense_chirho
               SET label_chirho = ?,
                   description_chirho = ?,
                   cluster_method_chirho = COALESCE(cluster_method_chirho, '') || '+llm_merge',
                   updated_at_chirho = datetime('now')
               WHERE sense_id_chirho = ?""",
            (label_chirho, description_chirho, canonical_id_chirho),
        )
        groups_kept_chirho += 1

        # Re-point assignments from source senses to canonical, then delete sources
        for source_id_chirho in source_ids_chirho:
            # Check if this source sense still exists (may have been merged earlier)
            cur_chirho.execute(
                "SELECT COUNT(*) FROM sense_chirho WHERE sense_id_chirho = ?",
                (source_id_chirho,),
            )
            if cur_chirho.fetchone()[0] == 0:
                continue

            # Re-point sense_assignment rows
            # First check if canonical already has an assignment for any of these
            # occurrences (would violate PK).  Handle by deleting the source
            # assignment where the occurrence already points to the canonical.
            cur_chirho.execute(
                """UPDATE sense_assignment_chirho
                   SET sense_id_chirho = ?
                   WHERE sense_id_chirho = ?
                   AND occurrence_id_chirho NOT IN (
                       SELECT occurrence_id_chirho
                       FROM sense_assignment_chirho
                       WHERE sense_id_chirho = ?
                   )""",
                (canonical_id_chirho, source_id_chirho, canonical_id_chirho),
            )
            rows_updated_chirho = cur_chirho.rowcount
            senses_updated_chirho += rows_updated_chirho

            # Delete any remaining assignments that couldn't be re-pointed
            # (because the occurrence already existed under canonical)
            cur_chirho.execute(
                "DELETE FROM sense_assignment_chirho WHERE sense_id_chirho = ?",
                (source_id_chirho,),
            )

            # Delete the source sense
            cur_chirho.execute(
                "DELETE FROM sense_chirho WHERE sense_id_chirho = ?",
                (source_id_chirho,),
            )
            senses_merged_chirho += 1

    return (groups_kept_chirho, senses_merged_chirho, senses_updated_chirho)


def record_progress_chirho(
    lemma_id_chirho: str,
    merged_chirho: int,
    kept_chirho: int,
) -> None:
    """Append a JSONL line to the progress file."""
    entry_chirho = {
        "lemmaIdChirho": lemma_id_chirho,
        "mergedChirho": merged_chirho,
        "keptChirho": kept_chirho,
        "timestampChirho": datetime.now(timezone.utc).isoformat(),
    }
    with open(PROGRESS_PATH_CHIRHO, "a", encoding="utf-8") as fh_chirho:
        fh_chirho.write(json.dumps(entry_chirho) + "\n")


def main_chirho() -> None:
    """Main entry point."""
    # ------ connect to database ------
    if not os.path.exists(SQLITE_PATH_CHIRHO):
        print(f"ERROR: Database not found at {SQLITE_PATH_CHIRHO}", file=sys.stderr)
        sys.exit(1)

    conn_chirho = sqlite3.connect(SQLITE_PATH_CHIRHO)
    conn_chirho.execute("PRAGMA journal_mode=WAL")
    conn_chirho.execute("PRAGMA foreign_keys=OFF")

    # ------ count senses before ------
    cur_chirho = conn_chirho.cursor()
    cur_chirho.execute("SELECT COUNT(*) FROM sense_chirho")
    senses_before_chirho = cur_chirho.fetchone()[0]
    print(f"Senses before: {senses_before_chirho}")

    # ------ determine pending work ------
    done_chirho = load_done_lemmas_chirho()
    pending_chirho = collect_pending_files_chirho(done_chirho)
    print(f"Already applied: {len(done_chirho)} lemmas")
    print(f"Pending to apply: {len(pending_chirho)} lemmas")

    if not pending_chirho:
        print("Nothing to do.")
        conn_chirho.close()
        return

    # ------ process each pending file ------
    total_groups_chirho = 0
    total_merged_chirho = 0
    total_updated_chirho = 0
    failed_chirho = 0

    for idx_chirho, (lemma_id_chirho, file_path_chirho) in enumerate(
        pending_chirho, start=1
    ):
        try:
            groups_chirho, merged_chirho, updated_chirho = apply_one_lemma_chirho(
                conn_chirho, lemma_id_chirho, file_path_chirho
            )
        except Exception as exc_chirho:
            print(
                f"  [{idx_chirho}/{len(pending_chirho)}] "
                f"ERROR processing {lemma_id_chirho}: {exc_chirho}",
                file=sys.stderr,
            )
            failed_chirho += 1
            continue

        total_groups_chirho += groups_chirho
        total_merged_chirho += merged_chirho
        total_updated_chirho += updated_chirho

        print(
            f"  [{idx_chirho}/{len(pending_chirho)}] "
            f"{lemma_id_chirho}: {groups_chirho} groups kept, "
            f"{merged_chirho} senses merged, "
            f"{updated_chirho} assignments re-pointed"
        )

        # Commit after each lemma and record progress
        conn_chirho.commit()
        record_progress_chirho(lemma_id_chirho, merged_chirho, groups_chirho)

    # ------ count senses after ------
    cur_chirho.execute("SELECT COUNT(*) FROM sense_chirho")
    senses_after_chirho = cur_chirho.fetchone()[0]

    cur_chirho.execute("SELECT COUNT(*) FROM sense_assignment_chirho")
    assignments_after_chirho = cur_chirho.fetchone()[0]

    cur_chirho.execute(
        "SELECT COUNT(*) FROM sense_chirho WHERE label_chirho IS NOT NULL"
    )
    labeled_after_chirho = cur_chirho.fetchone()[0]

    print("\n===== SUMMARY =====")
    print(f"Senses before:          {senses_before_chirho}")
    print(f"Senses after:           {senses_after_chirho}")
    print(f"Senses deleted:         {senses_before_chirho - senses_after_chirho}")
    print(f"Lemmas processed:       {len(pending_chirho) - failed_chirho}")
    print(f"Lemmas failed:          {failed_chirho}")
    print(f"Groups kept (new):      {total_groups_chirho}")
    print(f"Senses merged (del):    {total_merged_chirho}")
    print(f"Assignments re-pointed: {total_updated_chirho}")
    print(f"Labeled senses now:     {labeled_after_chirho}")
    print(f"Assignments remaining:  {assignments_after_chirho}")

    conn_chirho.close()


if __name__ == "__main__":
    main_chirho()
