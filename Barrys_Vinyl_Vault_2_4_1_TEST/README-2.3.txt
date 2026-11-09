Barry's Vinyl Vault 2.3 TEST BUILD

Changes: persist browser sign-in session, refresh expired Supabase access tokens, update app shell network-first, clarify dangerous cloud uploads.

IMPORTANT: Test on a separate Netlify preview URL first. Do not overwrite your production site before validating the existing 120-record cloud collection, JSON backups, login, refresh, and multi-device behavior.

The included starter-records.json has 107 records, NOT your live 120 records. On any fresh browser, sign in and DOWNLOAD cloud collection. NEVER upload the starter collection.

Security: Supabase publishable key only, no service-role keys. Existing SQL row-level security must be reviewed for multi-user rollout.

Known limitations: conflict handling remains manual, no record-by-record merge; no full automated end-to-end tests performed.
