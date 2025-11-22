import Database from "bun:sqlite";

const sqlite = new Database("astrobridge.db");

sqlite.run(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA wal_autocheckpoint = 1000;
    PRAGMA foreign_keys = ON;
    PRAGMA temp_store = MEMORY;
    PRAGMA cache_size = -20000; -- negative = KB, here ~20MB cache
    PRAGMA mmap_size = 268435456; -- 256MB mmap (if supported)
    PRAGMA encoding = "UTF-8";
`);
sqlite.run("PRAGMA optimize; ANALYZE;");
export default sqlite;
