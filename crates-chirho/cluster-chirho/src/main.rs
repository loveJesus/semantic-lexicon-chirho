// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

use anyhow::Result as ResultChirho;
use core_chirho::open_db_chirho;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{self, Write};
use std::sync::Mutex;
use std::time::Instant;

#[derive(Serialize)]
struct SenseClusterChirho {
    #[serde(rename = "senseIndexChirho")]
    sense_index_chirho: usize,
    #[serde(rename = "occurrenceIdsChirho")]
    occurrence_ids_chirho: Vec<String>,
    #[serde(rename = "methodChirho")]
    method_chirho: String,
}

#[derive(Serialize)]
struct LemmaResultChirho {
    #[serde(rename = "lemmaIdChirho")]
    lemma_id_chirho: String,
    #[serde(rename = "sensesChirho")]
    senses_chirho: Vec<SenseClusterChirho>,
}

/// Sparse feature vector: map from feature_key (lang_code hash + encoded_id) to weight.
type FeatureVecChirho = HashMap<u64, f64>;

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

/// Simple agglomerative clustering using average-linkage.
/// Returns cluster assignments (0-indexed).
fn cluster_agglomerative_chirho(
    vecs_chirho: &[FeatureVecChirho],
    threshold_chirho: f64,
) -> Vec<usize> {
    let n_chirho = vecs_chirho.len();
    if n_chirho <= 1 {
        return (0..n_chirho).collect();
    }

    // Start: each occurrence is its own cluster
    let mut assignments_chirho: Vec<usize> = (0..n_chirho).collect();
    let mut cluster_members_chirho: HashMap<usize, Vec<usize>> = HashMap::new();
    for i_chirho in 0..n_chirho {
        cluster_members_chirho.insert(i_chirho, vec![i_chirho]);
    }

    // Precompute similarity matrix (upper triangle)
    let mut sim_matrix_chirho: Vec<Vec<f64>> = vec![vec![0.0; n_chirho]; n_chirho];
    for i_chirho in 0..n_chirho {
        for j_chirho in (i_chirho + 1)..n_chirho {
            let sim_chirho =
                cosine_similarity_chirho(&vecs_chirho[i_chirho], &vecs_chirho[j_chirho]);
            sim_matrix_chirho[i_chirho][j_chirho] = sim_chirho;
            sim_matrix_chirho[j_chirho][i_chirho] = sim_chirho;
        }
    }

    loop {
        // Find most similar pair of clusters
        let mut best_sim_chirho = -1.0f64;
        let mut best_pair_chirho = (0usize, 0usize);

        let active_clusters_chirho: Vec<usize> = cluster_members_chirho.keys().copied().collect();
        for (idx_i_chirho, &ci_chirho) in active_clusters_chirho.iter().enumerate() {
            for &cj_chirho in &active_clusters_chirho[idx_i_chirho + 1..] {
                // Average linkage
                let members_i_chirho = &cluster_members_chirho[&ci_chirho];
                let members_j_chirho = &cluster_members_chirho[&cj_chirho];
                let mut sum_sim_chirho = 0.0f64;
                let pair_count_chirho = members_i_chirho.len() * members_j_chirho.len();
                for &mi_chirho in members_i_chirho {
                    for &mj_chirho in members_j_chirho {
                        sum_sim_chirho += sim_matrix_chirho[mi_chirho][mj_chirho];
                    }
                }
                let avg_sim_chirho = sum_sim_chirho / pair_count_chirho as f64;
                if avg_sim_chirho > best_sim_chirho {
                    best_sim_chirho = avg_sim_chirho;
                    best_pair_chirho = (ci_chirho, cj_chirho);
                }
            }
        }

        if best_sim_chirho < threshold_chirho || active_clusters_chirho.len() <= 1 {
            break;
        }

        // Merge
        let (ca_chirho, cb_chirho) = best_pair_chirho;
        let merged_chirho: Vec<usize> = {
            let mut m_chirho = cluster_members_chirho.remove(&ca_chirho).unwrap();
            m_chirho.extend(cluster_members_chirho.remove(&cb_chirho).unwrap());
            m_chirho
        };
        for &idx_chirho in &merged_chirho {
            assignments_chirho[idx_chirho] = ca_chirho;
        }
        cluster_members_chirho.insert(ca_chirho, merged_chirho);
    }

    // Renumber clusters to be contiguous 0-indexed
    let mut label_map_chirho: HashMap<usize, usize> = HashMap::new();
    let mut next_label_chirho = 0usize;
    let mut result_chirho = vec![0usize; n_chirho];
    for i_chirho in 0..n_chirho {
        let cluster_chirho = assignments_chirho[i_chirho];
        let label_chirho = *label_map_chirho.entry(cluster_chirho).or_insert_with(|| {
            let l_chirho = next_label_chirho;
            next_label_chirho += 1;
            l_chirho
        });
        result_chirho[i_chirho] = label_chirho;
    }

    result_chirho
}

fn main() -> ResultChirho<()> {
    let start_chirho = Instant::now();
    let conn_chirho = open_db_chirho()?;

    // Get all lemmas
    let mut lemma_stmt_chirho = conn_chirho.prepare("SELECT id_chirho FROM lemma_chirho")?;
    let lemma_ids_chirho: Vec<String> = lemma_stmt_chirho
        .query_map([], |row_chirho| row_chirho.get(0))?
        .collect::<Result<Vec<String>, _>>()?;

    eprintln!(
        "[cluster-chirho] Processing {} lemmas...",
        lemma_ids_chirho.len()
    );

    // For each lemma, get its occurrences and their features
    // We need: occurrence_id -> feature vector
    // Features: (language_code hash combined with phrase/head/part id) -> weight

    // Build a language code -> u64 hash map
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

    // Process lemmas in batches, building feature vectors
    let stdout_mutex_chirho = Mutex::new(io::stdout());
    let mut processed_chirho = 0u64;
    let total_senses_chirho = Mutex::new(0u64);

    for lemma_id_chirho in &lemma_ids_chirho {
        // Get word IDs for this lemma
        let mut word_stmt_chirho = conn_chirho.prepare_cached(
            "SELECT id_chirho FROM word_chirho WHERE lemma_id_chirho = ?1",
        )?;
        let word_ids_chirho: Vec<String> = word_stmt_chirho
            .query_map(rusqlite::params![lemma_id_chirho], |row_chirho| {
                row_chirho.get(0)
            })?
            .collect::<Result<Vec<String>, _>>()?;

        if word_ids_chirho.is_empty() {
            continue;
        }

        // Single occurrence or <= 5: one sense
        if word_ids_chirho.len() <= 5 {
            let result_chirho = LemmaResultChirho {
                lemma_id_chirho: lemma_id_chirho.clone(),
                senses_chirho: vec![SenseClusterChirho {
                    sense_index_chirho: 0,
                    occurrence_ids_chirho: word_ids_chirho,
                    method_chirho: "single".to_string(),
                }],
            };
            let json_chirho = serde_json::to_string(&result_chirho)?;
            let mut out_chirho = stdout_mutex_chirho.lock().unwrap();
            writeln!(out_chirho, "{}", json_chirho)?;
            *total_senses_chirho.lock().unwrap() += 1;
            processed_chirho += 1;
            continue;
        }

        // Build feature vectors for each occurrence
        let mut feature_vecs_chirho: Vec<FeatureVecChirho> = Vec::new();

        for word_id_chirho in &word_ids_chirho {
            let mut fv_chirho = FeatureVecChirho::new();

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
                    *fv_chirho.entry(key_chirho).or_insert(0.0) += 3.0;
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
                    *fv_chirho.entry(key_chirho).or_insert(0.0) += 2.0;
                }
            }

            // Part features (weight 1.0)
            let mut part_stmt_chirho = conn_chirho.prepare_cached(
                "SELECT language_code_chirho, part_id_chirho FROM gloss_part_chirho WHERE occurrence_id_chirho = ?1",
            )?;
            let parts_chirho: Vec<(String, i64)> = part_stmt_chirho
                .query_map(rusqlite::params![word_id_chirho], |row_chirho| {
                    Ok((row_chirho.get::<_, String>(0)?, row_chirho.get::<_, i64>(1)?))
                })?
                .collect::<Result<Vec<_>, _>>()?;

            for (lang_chirho, pid_chirho) in &parts_chirho {
                if let Some(&base_chirho) = lang_hash_chirho.get(lang_chirho) {
                    let key_chirho = base_chirho + 800_000 + *pid_chirho as u64;
                    *fv_chirho.entry(key_chirho).or_insert(0.0) += 1.0;
                }
            }

            feature_vecs_chirho.push(fv_chirho);
        }

        // Cap at 200 occurrences for clustering performance (sample if larger)
        let max_cluster_chirho = 200;
        let (clustered_word_ids_chirho, clustered_vecs_chirho) = if word_ids_chirho.len()
            > max_cluster_chirho
        {
            // Sample uniformly
            let step_chirho = word_ids_chirho.len() / max_cluster_chirho;
            let sampled_chirho: Vec<usize> =
                (0..word_ids_chirho.len()).step_by(step_chirho).take(max_cluster_chirho).collect();
            (
                sampled_chirho.iter().map(|&i| word_ids_chirho[i].clone()).collect::<Vec<_>>(),
                sampled_chirho
                    .iter()
                    .map(|&i| feature_vecs_chirho[i].clone())
                    .collect::<Vec<_>>(),
            )
        } else {
            (word_ids_chirho.clone(), feature_vecs_chirho.clone())
        };

        // Cluster
        let assignments_chirho =
            cluster_agglomerative_chirho(&clustered_vecs_chirho, 0.3);

        // Group into senses
        let mut sense_map_chirho: HashMap<usize, Vec<String>> = HashMap::new();
        for (idx_chirho, &cluster_chirho) in assignments_chirho.iter().enumerate() {
            sense_map_chirho
                .entry(cluster_chirho)
                .or_default()
                .push(clustered_word_ids_chirho[idx_chirho].clone());
        }

        // If we sampled, assign remaining occurrences to nearest cluster centroid
        if word_ids_chirho.len() > max_cluster_chirho {
            // Build centroids
            let mut centroids_chirho: HashMap<usize, FeatureVecChirho> = HashMap::new();
            let mut centroid_counts_chirho: HashMap<usize, f64> = HashMap::new();
            for (idx_chirho, &cluster_chirho) in assignments_chirho.iter().enumerate() {
                let centroid_chirho = centroids_chirho.entry(cluster_chirho).or_default();
                for (&key_chirho, &val_chirho) in &clustered_vecs_chirho[idx_chirho] {
                    *centroid_chirho.entry(key_chirho).or_insert(0.0) += val_chirho;
                }
                *centroid_counts_chirho.entry(cluster_chirho).or_insert(0.0) += 1.0;
            }
            for (cluster_chirho, centroid_chirho) in &mut centroids_chirho {
                let count_chirho = centroid_counts_chirho[cluster_chirho];
                for val_chirho in centroid_chirho.values_mut() {
                    *val_chirho /= count_chirho;
                }
            }

            // Assign non-sampled to nearest centroid
            let sampled_set_chirho: std::collections::HashSet<String> =
                clustered_word_ids_chirho.iter().cloned().collect();
            for (idx_chirho, wid_chirho) in word_ids_chirho.iter().enumerate() {
                if sampled_set_chirho.contains(wid_chirho) {
                    continue;
                }
                let fv_chirho = &feature_vecs_chirho[idx_chirho];
                let mut best_cluster_chirho = 0usize;
                let mut best_sim_chirho = -1.0f64;
                for (&cluster_chirho, centroid_chirho) in &centroids_chirho {
                    let sim_chirho = cosine_similarity_chirho(fv_chirho, centroid_chirho);
                    if sim_chirho > best_sim_chirho {
                        best_sim_chirho = sim_chirho;
                        best_cluster_chirho = cluster_chirho;
                    }
                }
                sense_map_chirho
                    .entry(best_cluster_chirho)
                    .or_default()
                    .push(wid_chirho.clone());
            }
        }

        let mut senses_chirho: Vec<SenseClusterChirho> = sense_map_chirho
            .into_iter()
            .enumerate()
            .map(|(idx_chirho, (_, ids_chirho))| SenseClusterChirho {
                sense_index_chirho: idx_chirho,
                occurrence_ids_chirho: ids_chirho,
                method_chirho: "agglomerative".to_string(),
            })
            .collect();
        senses_chirho.sort_by(|a_chirho, b_chirho| {
            b_chirho
                .occurrence_ids_chirho
                .len()
                .cmp(&a_chirho.occurrence_ids_chirho.len())
        });

        let num_senses_chirho = senses_chirho.len();
        let result_chirho = LemmaResultChirho {
            lemma_id_chirho: lemma_id_chirho.clone(),
            senses_chirho,
        };

        let json_chirho = serde_json::to_string(&result_chirho)?;
        let mut out_chirho = stdout_mutex_chirho.lock().unwrap();
        writeln!(out_chirho, "{}", json_chirho)?;
        *total_senses_chirho.lock().unwrap() += num_senses_chirho as u64;

        processed_chirho += 1;
        if processed_chirho % 500 == 0 {
            let elapsed_chirho = start_chirho.elapsed().as_secs_f64();
            eprintln!(
                "[cluster-chirho] {}/{} lemmas processed ({:.1}s)",
                processed_chirho,
                lemma_ids_chirho.len(),
                elapsed_chirho
            );
        }
    }

    let elapsed_chirho = start_chirho.elapsed().as_secs_f64();
    let total_chirho = *total_senses_chirho.lock().unwrap();
    eprintln!("\n[cluster-chirho] === COMPLETE ===");
    eprintln!("  Lemmas processed: {}", processed_chirho);
    eprintln!("  Total senses: {}", total_chirho);
    eprintln!(
        "  Avg senses/lemma: {:.2}",
        total_chirho as f64 / processed_chirho.max(1) as f64
    );
    eprintln!("  Time: {:.1}s", elapsed_chirho);

    Ok(())
}
