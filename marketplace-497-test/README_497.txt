VINYL VAULT MARKETPLACE 4.9.7 TEST — NOT PRODUCTION READY

Changes: optional note field, active-offer status buttons, duplicate negotiation checks before sending, dashboard reminder for seller responses.

IMPORTANT: Supabase currently rejects empty messages. DO NOT test blank notes until its message length CHECK constraint is modified to allow empty strings (0..1000). See SUPABASE_497_MIGRATION.sql preflight; this migration deliberately does not drop the constraint automatically.

Database duplicate-offer trigger is included, but should be applied only after reviewing preflight duplicate counts and ensuring there are no conflicting active test offers. The trigger prevents duplicate active negotiations by the same buyer on a listing. Existing unique accepted-offer index remains.

Keep 4.9.6 unchanged. Upload these files into a NEW marketplace-497-test folder. No payments, escrow or shipping protection.
