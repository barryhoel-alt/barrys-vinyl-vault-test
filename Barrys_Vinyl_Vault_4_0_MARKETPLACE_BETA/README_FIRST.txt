VINYL VAULT 4.0 MARKETPLACE BETA

1. Keep your existing 3.6.1 folder unchanged. Download a JSON backup.
2. Upload ALL files in this folder into a NEW GitHub folder: Barrys_Vinyl_Vault_4_0_MARKETPLACE_BETA
3. Visit the new /index.html and open Marketplace. Sign in via the existing Cloud Sync first.
4. The marketplace is NOT functional until you review and run SETUP_MARKETPLACE.sql in Supabase SQL Editor. This creates two NEW tables, without changing vault_collections. Do not run SQL without understanding the public data and RLS policies.
5. Only explicitly published listing fields become public. Private collection is NOT exposed. Public listing read requires a signed-in session in this beta UI; the database policy permits public reads of active listings.
6. This is a TEST BETA, not a production-ready public marketplace. No payments, shipping, escrow, dispute resolution, private messaging, identity verification, anti-spam or moderation yet. Do not invite public users until those features are addressed.
7. Offers can be viewed by seller and buyer, but there is no offer acceptance workflow yet.
8. Version 3.6.1 cloud sync logic is copied unchanged. Test syncing before using this version as primary.
