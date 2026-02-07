// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

use anyhow::Result as ResultChirho;
use core_chirho::open_db_chirho;
use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{self, Write};
use std::sync::Mutex;
use std::time::Instant;

type FeatureVecChirho = HashMap<u64, f64>;

#[derive(Serialize)]
struct EdgeChirho {
    #[serde(rename = "senseAChirho")]
    sense_a_chirho: i64,
    #[serde(rename = "senseBChirho")]
    sense_b_chirho: i64,
    #[serde(rename = "similarityChirho")]
    similarity_chirho: f64,
}

fn cosine_similarity_chirho(a_chirho: &FeatureVecChirho, b_chirho: &FeatureVecChirho) -> f64 {
    let mut dot_chirho = 0.0f64;
    let mut norm_a_chirho = 0.0f64;
    let mut norm_b_chirho = 0.0f64;

    for (&key_chirho, &val_chirho) in a_chirho {
        norm_a_chirho += val_chirho * val_chirho;
        if let Some(&bval_chirho) = b_chirho.get(&key_chirho) {
            dot_chirho += val_chirho * bval_chirho;
        }
    }
    for (_, &val_chirho) in b_chirho {
        norm_b_chirho += val_chirho * val_chirho;
    }

    let denom_chirho = norm_a_chirho.sqrt() * norm_b_chirho.sqrt();
    if denom_chirho == 0.0 {
        0.0
    } else {
        dot_chirho / denom_chirho
    }
}

fn main() -> ResultChirho<()> {
    let start_chirho = Instant::now();
    let conn_chirho = open_db_chirho()?;

    // Get all senses
    let mut sense_stmt_chirho =
        conn_chirho.prepare("SELECT sense_id_chirho, lemma_id_chirho FROM sense_chirho")?;
    let senses_chirho: Vec<(i64, String)> = sense_stmt_chirho
        .query_map([], |row_chirho| {
            Ok((row_chirho.get(0)?, row_chirho.get(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    eprintln!(
        "[similarity-chirho] Building prototype vectors for {} senses...",
        senses_chirho.len()
    );

    // Build language hash map
    let mut lang_hash_chirho: HashMap<String, u64> = HashMap::new();
    let mut lang_stmt_chirho = conn_chirho.prepare(
        "SELECT DISTINCT language_code_chirho FROM gloss_phrase_chirho",
    )?;
    let langs_chirho: Vec<String> = lang_stmt_chirho
        .query_map([], |row_chirho| row_chirho.get(0))?
        .collect::<Result<Vec<String>, _>>()?;
    for (idx_chirho, lang_chirho) in langs_chirho.iter().enumerate() {
        lang_hash_chirho.insert(lang_chirho.clone(), (idx_chirho as u64 + 1) * 1_000_000);
    }

    // Build prototype vector for each sense (average of member occurrence vectors)
    let mut prototypes_chirho: Vec<(i64, FeatureVecChirho)> = Vec::new();

    for (sense_id_chirho, _lemma_id_chirho) in &senses_chirho {
        // Get occurrence IDs for this sense
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

        let mut prototype_chirho = FeatureVecChirho::new();
        // Sample up to 50 occurrences for efficiency
        let sample_chirho: Vec<&String> = if occ_ids_chirho.len() > 50 {
            let step_chirho = occ_ids_chirho.len() / 50;
            occ_ids_chirho
                .iter()
                .step_by(step_chirho)
                .take(50)
                .collect()
        } else {
            occ_ids_chirho.iter().collect()
        };
        let sample_count_chirho = sample_chirho.len() as f64;

        for word_id_chirho in &sample_chirho {
            // Phrase features (weight 3.0)
            let mut phrase_stmt_chirho = conn_chirho.prepare_cached(
                "SELECT language_code_chirho, phrase_id_chirho FROM gloss_phrase_chirho WHERE occurrence_id_chirho = ?1",
            )?;
            let phrases_chirho: Vec<(String, i64)> = phrase_stmt_chirho
                .query_map(rusqlite::params![word_id_chirho], |row_chirho| {
                    Ok((row_chirho.get::<_, String>(0)?, row_chirho.get::<_, i64>(1)?))
                })?
                .collect::<Result<Vec<_>, _>>()?;

            for (lang_chirho, pid_chirho) in &phrases_chirho {
                if let Some(&base_chirho) = lang_hash_chirho.get(lang_chirho) {
                    let key_chirho = base_chirho + *pid_chirho as u64;
                    *prototype_chirho.entry(key_chirho).or_insert(0.0) += 3.0 / sample_count_chirho;
                }
            }

            // Head features (weight 2.0)
            let mut head_stmt_chirho = conn_chirho.prepare_cached(
                "SELECT language_code_chirho, head_id_chirho FROM gloss_head_chirho WHERE occurrence_id_chirho = ?1",
            )?;
            let heads_chirho: Vec<(String, i64)> = head_stmt_chirho
                .query_map(rusqlite::params![word_id_chirho], |row_chirho| {
                    Ok((row_chirho.get::<_, String>(0)?, row_chirho.get::<_, i64>(1)?))
                })?
                .collect::<Result<Vec<_>, _>>()?;

            for (lang_chirho, hid_chirho) in &heads_chirho {
                if let Some(&base_chirho) = lang_hash_chirho.get(lang_chirho) {
                    let key_chirho = base_chirho + 500_000 + *hid_chirho as u64;
                    *prototype_chirho.entry(key_chirho).or_insert(0.0) += 2.0 / sample_count_chirho;
                }
            }
        }

        prototypes_chirho.push((*sense_id_chirho, prototype_chirho));

        if prototypes_chirho.len() % 5000 == 0 {
            eprintln!(
                "[similarity-chirho] Built {}/{} prototypes ({:.1}s)",
                prototypes_chirho.len(),
                senses_chirho.len(),
                start_chirho.elapsed().as_secs_f64()
            );
        }
    }

    eprintln!(
        "[similarity-chirho] {} prototypes built in {:.1}s",
        prototypes_chirho.len(),
        start_chirho.elapsed().as_secs_f64()
    );

    // Compute pairwise similarities (only above threshold)
    // For large sense counts, use blocking to avoid O(n^2) all-pairs
    let threshold_chirho = 0.1;
    let n_chirho = prototypes_chirho.len();
    let edges_chirho = Mutex::new(Vec::<EdgeChirho>::new());
    let edge_count_chirho = Mutex::new(0u64);

    eprintln!(
        "[similarity-chirho] Computing pairwise similarities ({} x {} = {} pairs)...",
        n_chirho,
        n_chirho,
        (n_chirho * (n_chirho - 1)) / 2
    );

    // Use rayon to parallelize over rows
    (0..n_chirho).into_par_iter().for_each(|i_chirho| {
        let mut local_edges_chirho = Vec::new();
        let (id_a_chirho, vec_a_chirho) = &prototypes_chirho[i_chirho];

        for j_chirho in (i_chirho + 1)..n_chirho {
            let (id_b_chirho, vec_b_chirho) = &prototypes_chirho[j_chirho];
            let sim_chirho = cosine_similarity_chirho(vec_a_chirho, vec_b_chirho);
            if sim_chirho > threshold_chirho {
                local_edges_chirho.push(EdgeChirho {
                    sense_a_chirho: *id_a_chirho,
                    sense_b_chirho: *id_b_chirho,
                    similarity_chirho: (sim_chirho * 10000.0).round() / 10000.0,
                });
            }
        }

        if !local_edges_chirho.is_empty() {
            let count_chirho = local_edges_chirho.len() as u64;
            let mut edges_lock_chirho = edges_chirho.lock().unwrap();
            edges_lock_chirho.extend(local_edges_chirho);
            *edge_count_chirho.lock().unwrap() += count_chirho;
        }
    });

    let final_edges_chirho = edges_chirho.into_inner().unwrap();
    eprintln!(
        "[similarity-chirho] {} edges above threshold {:.2} ({:.1}s)",
        final_edges_chirho.len(),
        threshold_chirho,
        start_chirho.elapsed().as_secs_f64()
    );

    // Output as JSON lines
    let stdout_chirho = io::stdout();
    let mut out_chirho = stdout_chirho.lock();
    for edge_chirho in &final_edges_chirho {
        let json_chirho = serde_json::to_string(edge_chirho)?;
        writeln!(out_chirho, "{}", json_chirho)?;
    }

    let elapsed_chirho = start_chirho.elapsed().as_secs_f64();
    eprintln!("\n[similarity-chirho] === COMPLETE ===");
    eprintln!("  Senses:      {}", n_chirho);
    eprintln!("  Edges:       {}", final_edges_chirho.len());
    eprintln!("  Time:        {:.1}s", elapsed_chirho);

    Ok(())
}
