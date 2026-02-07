// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

use anyhow::Result as ResultChirho;
use rusqlite::Connection;
use std::collections::HashMap;
use std::env;
use unicode_normalization::UnicodeNormalization;

/// Open the SQLite database from SQLITE_PATH_CHIRHO env var with WAL mode.
pub fn open_db_chirho() -> ResultChirho<Connection> {
    let path_chirho =
        env::var("SQLITE_PATH_CHIRHO").unwrap_or_else(|_| "data-chirho/semantic-chirho.db".into());
    let conn_chirho = Connection::open(&path_chirho)?;
    conn_chirho.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA cache_size=-64000;
         PRAGMA temp_store=MEMORY;",
    )?;
    Ok(conn_chirho)
}

/// Dictionary encoder: maps strings to integer IDs, caching in memory.
pub struct DictionaryEncoderChirho {
    cache_chirho: HashMap<String, u32>,
    next_id_chirho: u32,
    type_chirho: String,
}

impl DictionaryEncoderChirho {
    pub fn new_chirho(type_name_chirho: &str) -> Self {
        Self {
            cache_chirho: HashMap::new(),
            next_id_chirho: 1,
            type_chirho: type_name_chirho.to_string(),
        }
    }

    /// Encode a string token, returning its integer ID.
    /// Caches in memory — call flush_chirho() to persist to SQLite.
    pub fn encode_chirho(&mut self, token_chirho: &str) -> u32 {
        if let Some(&id_chirho) = self.cache_chirho.get(token_chirho) {
            return id_chirho;
        }
        let id_chirho = self.next_id_chirho;
        self.next_id_chirho += 1;
        self.cache_chirho
            .insert(token_chirho.to_string(), id_chirho);
        id_chirho
    }

    /// Flush all cached entries to the dictionary_chirho table.
    pub fn flush_chirho(&self, conn_chirho: &Connection) -> ResultChirho<usize> {
        let mut stmt_chirho = conn_chirho.prepare(
            "INSERT OR IGNORE INTO dictionary_chirho (encoded_id_chirho, token_chirho, type_chirho) VALUES (?1, ?2, ?3)",
        )?;
        let mut count_chirho = 0usize;
        for (token_chirho, &id_chirho) in &self.cache_chirho {
            stmt_chirho.execute(rusqlite::params![id_chirho, token_chirho, self.type_chirho])?;
            count_chirho += 1;
        }
        Ok(count_chirho)
    }

    pub fn len_chirho(&self) -> usize {
        self.cache_chirho.len()
    }
}

/// Normalize a gloss string: NFKC, normalize dashes, trim whitespace.
pub fn normalize_gloss_chirho(text_chirho: &str) -> String {
    let nfkc_chirho: String = text_chirho.nfkc().collect();
    let normalized_chirho = nfkc_chirho
        .replace('\u{2013}', "-") // en-dash
        .replace('\u{2014}', "-") // em-dash
        .replace('\u{2212}', "-") // minus sign
        .replace('\u{2010}', "-") // hyphen
        .replace('\u{2011}', "-"); // non-breaking hyphen
    normalized_chirho.trim().to_string()
}

/// Split a gloss on dash separator (composition).
pub fn split_parts_chirho(text_chirho: &str) -> Vec<String> {
    text_chirho
        .split('-')
        .filter(|s_chirho| !s_chirho.is_empty())
        .map(|s_chirho| s_chirho.to_string())
        .collect()
}

/// Split a gloss on pipe separator (alternatives).
pub fn split_alts_chirho(text_chirho: &str) -> Vec<String> {
    text_chirho
        .split('|')
        .filter(|s_chirho| !s_chirho.is_empty())
        .map(|s_chirho| s_chirho.trim().to_string())
        .collect()
}

/// Extract the head of a compound gloss (last part by default).
pub fn extract_head_chirho(parts_chirho: &[String]) -> Option<String> {
    parts_chirho.last().cloned()
}

#[cfg(test)]
mod tests_chirho {
    use super::*;

    #[test]
    fn test_normalize_gloss_chirho() {
        assert_eq!(normalize_gloss_chirho("make\u{2013}known"), "make-known");
        assert_eq!(normalize_gloss_chirho("  hello  "), "hello");
        assert_eq!(normalize_gloss_chirho("heart\u{2014}desire"), "heart-desire");
    }

    #[test]
    fn test_split_parts_chirho() {
        let parts_chirho = split_parts_chirho("make-known");
        assert_eq!(parts_chirho, vec!["make", "known"]);
    }

    #[test]
    fn test_split_alts_chirho() {
        let alts_chirho = split_alts_chirho("judge|rule");
        assert_eq!(alts_chirho, vec!["judge", "rule"]);
    }

    #[test]
    fn test_extract_head_chirho() {
        let parts_chirho = vec!["make".to_string(), "known".to_string()];
        assert_eq!(extract_head_chirho(&parts_chirho), Some("known".to_string()));
    }

    #[test]
    fn test_dictionary_encoder_chirho() {
        let mut enc_chirho = DictionaryEncoderChirho::new_chirho("test");
        let id1_chirho = enc_chirho.encode_chirho("hello");
        let id2_chirho = enc_chirho.encode_chirho("world");
        let id3_chirho = enc_chirho.encode_chirho("hello");
        assert_eq!(id1_chirho, id3_chirho);
        assert_ne!(id1_chirho, id2_chirho);
        assert_eq!(enc_chirho.len_chirho(), 2);
    }
}
