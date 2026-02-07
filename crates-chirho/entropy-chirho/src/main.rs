// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

use anyhow::Result as ResultChirho;
use core_chirho::open_db_chirho;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{self, Write};
use std::time::Instant;

#[derive(Serialize)]
struct SenseEntropyChirho {
    #[serde(rename = "senseIdChirho")]
    sense_id_chirho: i64,
    #[serde(rename = "lemmaIdChirho")]
    lemma_id_chirho: String,
    #[serde(rename = "entropyByLangChirho")]
    entropy_by_lang_chirho: HashMap<String, f64>,
    #[serde(rename = "avgEntropyChirho")]
    avg_entropy_chirho: f64,
    #[serde(rename = "occurrenceCountChirho")]
    occurrence_count_chirho: usize,
    #[serde(rename = "flagChirho")]
    flag_chirho: Option<String>,
}

fn main() -> ResultChirho<()> {
    let start_chirho = Instant::now();
    let conn_chirho = open_db_chirho()?;

    // Get all senses with their lemma_id
    let mut sense_stmt_chirho =
        conn_chirho.prepare("SELECT sense_id_chirho, lemma_id_chirho FROM sense_chirho")?;
    let senses_chirho: Vec<(i64, String)> = sense_stmt_chirho
        .query_map([], |row_chirho| {
            Ok((row_chirho.get(0)?, row_chirho.get(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    eprintln!(
        "[entropy-chirho] Computing entropy for {} senses...",
        senses_chirho.len()
    );

    let stdout_chirho = io::stdout();
    let mut out_chirho = stdout_chirho.lock();
    let mut processed_chirho = 0u64;
    let mut split_candidates_chirho = 0u64;
    let mut merge_candidates_chirho = 0u64;

    // Group senses by lemma for merge candidate detection
    let mut lemma_senses_chirho: HashMap<String, Vec<(i64, HashMap<String, f64>)>> =
        HashMap::new();

    for (sense_id_chirho, lemma_id_chirho) in &senses_chirho {
        // Get all occurrences for this sense
        let mut occ_stmt_chirho = conn_chirho.prepare_cached(
            "SELECT occurrence_id_chirho FROM sense_assignment_chirho WHERE sense_id_chirho = ?1",
        )?;
        let occ_ids_chirho: Vec<String> = occ_stmt_chirho
            .query_map(rusqlite::params![sense_id_chirho], |row_chirho| {
                row_chirho.get(0)
            })?
            .collect::<Result<Vec<String>, _>>()?;

        if occ_ids_chirho.is_empty() {
            continue;
        }

        // For each language, compute phrase distribution and entropy
        let mut entropy_by_lang_chirho: HashMap<String, f64> = HashMap::new();

        // Build placeholders for IN clause
        let placeholders_chirho: String = occ_ids_chirho
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");

        let query_chirho = format!(
            "SELECT language_code_chirho, phrase_id_chirho, COUNT(*) as freq_chirho
             FROM gloss_phrase_chirho
             WHERE occurrence_id_chirho IN ({})
             GROUP BY language_code_chirho, phrase_id_chirho",
            placeholders_chirho
        );

        let mut stmt_chirho = conn_chirho.prepare_cached(&query_chirho)?;

        // Build params
        let params_chirho: Vec<Box<dyn rusqlite::types::ToSql>> = occ_ids_chirho
            .iter()
            .map(|s_chirho| Box::new(s_chirho.clone()) as Box<dyn rusqlite::types::ToSql>)
            .collect();

        let param_refs_chirho: Vec<&dyn rusqlite::types::ToSql> =
            params_chirho.iter().map(|p_chirho| p_chirho.as_ref()).collect();

        let rows_chirho: Vec<(String, i64, i64)> = stmt_chirho
            .query_map(param_refs_chirho.as_slice(), |row_chirho| {
                Ok((
                    row_chirho.get::<_, String>(0)?,
                    row_chirho.get::<_, i64>(1)?,
                    row_chirho.get::<_, i64>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Group by language
        let mut lang_freqs_chirho: HashMap<String, Vec<i64>> = HashMap::new();
        for (lang_chirho, _phrase_chirho, freq_chirho) in &rows_chirho {
            lang_freqs_chirho
                .entry(lang_chirho.clone())
                .or_default()
                .push(*freq_chirho);
        }

        // Compute entropy per language
        for (lang_chirho, freqs_chirho) in &lang_freqs_chirho {
            let total_chirho: i64 = freqs_chirho.iter().sum();
            if total_chirho == 0 {
                continue;
            }
            let mut h_chirho = 0.0f64;
            for &f_chirho in freqs_chirho {
                let p_chirho = f_chirho as f64 / total_chirho as f64;
                if p_chirho > 0.0 {
                    h_chirho -= p_chirho * p_chirho.log2();
                }
            }
            entropy_by_lang_chirho.insert(lang_chirho.clone(), h_chirho);
        }

        let avg_entropy_chirho = if entropy_by_lang_chirho.is_empty() {
            0.0
        } else {
            let sum_chirho: f64 = entropy_by_lang_chirho.values().sum();
            sum_chirho / entropy_by_lang_chirho.len() as f64
        };

        // Flag split candidates: avg entropy > 1.5 in >= 3 languages
        let high_entropy_langs_chirho = entropy_by_lang_chirho
            .values()
            .filter(|&&h_chirho| h_chirho > 1.5)
            .count();
        let flag_chirho = if high_entropy_langs_chirho >= 3 {
            split_candidates_chirho += 1;
            Some("split_candidate_chirho".to_string())
        } else {
            None
        };

        let result_chirho = SenseEntropyChirho {
            sense_id_chirho: *sense_id_chirho,
            lemma_id_chirho: lemma_id_chirho.clone(),
            entropy_by_lang_chirho: entropy_by_lang_chirho.clone(),
            avg_entropy_chirho,
            occurrence_count_chirho: occ_ids_chirho.len(),
            flag_chirho,
        };

        let json_chirho = serde_json::to_string(&result_chirho)?;
        writeln!(out_chirho, "{}", json_chirho)?;

        // Store for merge candidate detection
        lemma_senses_chirho
            .entry(lemma_id_chirho.clone())
            .or_default()
            .push((*sense_id_chirho, entropy_by_lang_chirho));

        processed_chirho += 1;
        if processed_chirho % 5000 == 0 {
            eprintln!(
                "[entropy-chirho] {}/{} senses processed ({:.1}s)",
                processed_chirho,
                senses_chirho.len(),
                start_chirho.elapsed().as_secs_f64()
            );
        }
    }

    // Check merge candidates: pairs of senses from same lemma with similar entropy profiles
    for (_lemma_chirho, senses_vec_chirho) in &lemma_senses_chirho {
        if senses_vec_chirho.len() < 2 {
            continue;
        }
        for i_chirho in 0..senses_vec_chirho.len() {
            for j_chirho in (i_chirho + 1)..senses_vec_chirho.len() {
                let (id_a_chirho, ent_a_chirho) = &senses_vec_chirho[i_chirho];
                let (id_b_chirho, ent_b_chirho) = &senses_vec_chirho[j_chirho];

                // Compute cosine similarity of entropy vectors
                let mut dot_chirho = 0.0f64;
                let mut norm_a_chirho = 0.0f64;
                let mut norm_b_chirho = 0.0f64;

                for (lang_chirho, &val_a_chirho) in ent_a_chirho {
                    norm_a_chirho += val_a_chirho * val_a_chirho;
                    if let Some(&val_b_chirho) = ent_b_chirho.get(lang_chirho) {
                        dot_chirho += val_a_chirho * val_b_chirho;
                    }
                }
                for (_, &val_b_chirho) in ent_b_chirho {
                    norm_b_chirho += val_b_chirho * val_b_chirho;
                }

                let denom_chirho = norm_a_chirho.sqrt() * norm_b_chirho.sqrt();
                let sim_chirho = if denom_chirho > 0.0 {
                    dot_chirho / denom_chirho
                } else {
                    0.0
                };

                if sim_chirho > 0.95 {
                    merge_candidates_chirho += 1;
                    // Output merge candidate as a special JSON line
                    let merge_json_chirho = serde_json::json!({
                        "flagChirho": "merge_candidate_chirho",
                        "senseAChirho": id_a_chirho,
                        "senseBChirho": id_b_chirho,
                        "similarityChirho": sim_chirho
                    });
                    writeln!(out_chirho, "{}", merge_json_chirho)?;
                }
            }
        }
    }

    let elapsed_chirho = start_chirho.elapsed().as_secs_f64();
    eprintln!("\n[entropy-chirho] === COMPLETE ===");
    eprintln!("  Senses processed:    {}", processed_chirho);
    eprintln!("  Split candidates:    {}", split_candidates_chirho);
    eprintln!("  Merge candidates:    {}", merge_candidates_chirho);
    eprintln!("  Time:                {:.1}s", elapsed_chirho);

    Ok(())
}
