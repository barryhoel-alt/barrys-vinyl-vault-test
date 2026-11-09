BARRY’S VINYL VAULT 3.3 — CLOUD SAFE

IMPORTANT: This build does NOT include your private 121-record catalogue as public web assets. Keep your 3.2 ZIP and downloaded JSON backup safe.

To use: host this entire folder over HTTPS (GitHub Pages or Netlify). Do not open index.html via file:// for cloud sync or phone camera.

In Cloud Sync, enter your existing Supabase URL, publishable/anon key and existing account login. NEVER use service-role or secret keys. Click Download cloud collection FIRST on Windows and on Android. After download, automatic syncing is enabled. No cloud writes occur before successful download.

The existing Supabase table public.vault_collections is reused; do NOT run setup SQL or change policies. If the cloud has different records than your 121-album backup, stop and compare before editing. Cloud sync works only while the app is open and online; changes made offline sync when app is opened/online.

Cloud writes use a conditional updated_at check; conflicts pause syncing. This is not record-level merging. Always keep independent JSON backups. Do not use two devices to edit simultaneously before syncing.

Version 3.3 uses separate browser storage from 3.2. To import the backup locally, use Restore backup, but do not do this after connecting to cloud unless you deliberately intend to replace your local records.
