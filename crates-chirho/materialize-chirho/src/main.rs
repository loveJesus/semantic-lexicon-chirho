// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

use anyhow::Result as ResultChirho;
use core_chirho::{
    normalize_gloss_chirho, open_db_chirho, split_alts_chirho, split_parts_chirho,
    extract_head_chirho, DictionaryEncoderChirho,
};
use std::time::Instant;

fn main() -> ResultChirho<()> {
    let start_chirho = Instant::now();
    let conn_chirho = open_db_chirho()?;

    let total_chirho: u64 = conn_chirho.query_row(
        "SELECT COUNT(*) FROM gloss_import_chirho",
        [],
        |row_chirho| row_chirho.get(0),
    )?;
    println!("[materialize-chirho] Total rows to process: {}", total_chirho);

    let mut phrase_enc_chirho = DictionaryEncoderChirho::new_chirho("phrase");
    let mut part_enc_chirho = DictionaryEncoderChirho::new_chirho("part");
    let mut head_enc_chirho = DictionaryEncoderChirho::new_chirho("head");
    let mut alt_enc_chirho = DictionaryEncoderChirho::new_chirho("alt");

    let batch_size_chirho: usize = 10_000;
    let mut offset_chirho: u64 = 0;
    let mut processed_chirho: u64 = 0;
    let mut phrase_count_chirho: u64 = 0;
    let mut part_count_chirho: u64 = 0;
    let mut head_count_chirho: u64 = 0;
    let mut alt_count_chirho: u64 = 0;

    loop {
        conn_chirho.execute_batch("BEGIN")?;

        let mut stmt_chirho = conn_chirho.prepare_cached(
            "SELECT word_id_chirho, language_code_chirho, gloss_text_chirho
             FROM gloss_import_chirho
             LIMIT ?1 OFFSET ?2",
        )?;

        let rows_chirho: Vec<(String, String, String)> = stmt_chirho
            .query_map(
                rusqlite::params![batch_size_chirho as i64, offset_chirho as i64],
                |row_chirho| {
                    Ok((
                        row_chirho.get::<_, String>(0)?,
                        row_chirho.get::<_, String>(1)?,
                        row_chirho.get::<_, String>(2)?,
                    ))
                },
            )?
            .collect::<Result<Vec<_>, _>>()?;

        if rows_chirho.is_empty() {
            conn_chirho.execute_batch("COMMIT")?;
            break;
        }

        let mut phrase_stmt_chirho = conn_chirho.prepare_cached(
            "INSERT OR IGNORE INTO gloss_phrase_chirho (occurrence_id_chirho, language_code_chirho, phrase_id_chirho) VALUES (?1, ?2, ?3)",
        )?;
        let mut part_stmt_chirho = conn_chirho.prepare_cached(
            "INSERT OR IGNORE INTO gloss_part_chirho (occurrence_id_chirho, language_code_chirho, position_chirho, part_id_chirho) VALUES (?1, ?2, ?3, ?4)",
        )?;
        let mut head_stmt_chirho = conn_chirho.prepare_cached(
            "INSERT OR IGNORE INTO gloss_head_chirho (occurrence_id_chirho, language_code_chirho, head_id_chirho) VALUES (?1, ?2, ?3)",
        )?;
        let mut alt_stmt_chirho = conn_chirho.prepare_cached(
            "INSERT OR IGNORE INTO gloss_alt_chirho (occurrence_id_chirho, language_code_chirho, alt_index_chirho, alt_id_chirho) VALUES (?1, ?2, ?3, ?4)",
        )?;

        for (word_id_chirho, lang_chirho, gloss_chirho) in &rows_chirho {
            let normalized_chirho = normalize_gloss_chirho(gloss_chirho);
            if normalized_chirho.is_empty() {
                continue;
            }

            // Check for alternatives first
            let alts_chirho = split_alts_chirho(&normalized_chirho);
            if alts_chirho.len() > 1 {
                for (idx_chirho, alt_chirho) in alts_chirho.iter().enumerate() {
                    let alt_id_chirho = alt_enc_chirho.encode_chirho(alt_chirho);
                    alt_stmt_chirho.execute(rusqlite::params![
                        word_id_chirho,
                        lang_chirho,
                        idx_chirho as i32,
                        alt_id_chirho
                    ])?;
                    alt_count_chirho += 1;
                }
            }

            // Use the first alternative (or the whole string if no pipe)
            let primary_chirho = if alts_chirho.len() > 1 {
                &alts_chirho[0]
            } else {
                &normalized_chirho
            };

            // Phrase
            let phrase_id_chirho = phrase_enc_chirho.encode_chirho(primary_chirho);
            phrase_stmt_chirho.execute(rusqlite::params![
                word_id_chirho,
                lang_chirho,
                phrase_id_chirho
            ])?;
            phrase_count_chirho += 1;

            // Parts
            let parts_chirho = split_parts_chirho(primary_chirho);
            for (pos_chirho, part_chirho) in parts_chirho.iter().enumerate() {
                let part_id_chirho = part_enc_chirho.encode_chirho(part_chirho);
                part_stmt_chirho.execute(rusqlite::params![
                    word_id_chirho,
                    lang_chirho,
                    pos_chirho as i32,
                    part_id_chirho
                ])?;
                part_count_chirho += 1;
            }

            // Head
            if let Some(head_chirho) = extract_head_chirho(&parts_chirho) {
                let head_id_chirho = head_enc_chirho.encode_chirho(&head_chirho);
                head_stmt_chirho.execute(rusqlite::params![
                    word_id_chirho,
                    lang_chirho,
                    head_id_chirho
                ])?;
                head_count_chirho += 1;
            }
        }

        conn_chirho.execute_batch("COMMIT")?;
        processed_chirho += rows_chirho.len() as u64;
        offset_chirho += batch_size_chirho as u64;

        if processed_chirho % 100_000 < batch_size_chirho as u64 {
            let elapsed_chirho = start_chirho.elapsed().as_secs_f64();
            let rate_chirho = processed_chirho as f64 / elapsed_chirho;
            println!(
                "[materialize-chirho] {}/{} rows processed ({:.0} rows/sec)",
                processed_chirho, total_chirho, rate_chirho
            );
        }
    }

    // Flush dictionaries
    println!("[materialize-chirho] Flushing dictionaries...");
    conn_chirho.execute_batch("BEGIN")?;
    let phrase_dict_count_chirho = phrase_enc_chirho.flush_chirho(&conn_chirho)?;
    let part_dict_count_chirho = part_enc_chirho.flush_chirho(&conn_chirho)?;
    let head_dict_count_chirho = head_enc_chirho.flush_chirho(&conn_chirho)?;
    let alt_dict_count_chirho = alt_enc_chirho.flush_chirho(&conn_chirho)?;
    conn_chirho.execute_batch("COMMIT")?;

    let elapsed_chirho = start_chirho.elapsed().as_secs_f64();
    println!("\n[materialize-chirho] === COMPLETE ===");
    println!("  Phrases: {}", phrase_count_chirho);
    println!("  Parts:   {}", part_count_chirho);
    println!("  Heads:   {}", head_count_chirho);
    println!("  Alts:    {}", alt_count_chirho);
    println!(
        "  Dictionary: {} phrases, {} parts, {} heads, {} alts",
        phrase_dict_count_chirho, part_dict_count_chirho, head_dict_count_chirho, alt_dict_count_chirho
    );
    println!("  Time:    {:.1}s", elapsed_chirho);

    Ok(())
}
