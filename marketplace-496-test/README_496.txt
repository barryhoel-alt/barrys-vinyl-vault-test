Vinyl Vault Marketplace 4.9.6 TEST

Deploy the seven marketplace.* files (HTML and six JS files) together in a NEW marketplace-496-test folder. Keep 4.9.5 intact. Do NOT upload SQL to the public GitHub website if it contains credentials (this audit contains none).

Changes: 4.9.6 labels, explicit safety notices for accepted offers and sale records, duplicate-sale client check and disabled button during mark-sold request. Existing backend and Supabase data unchanged.

IMPORTANT: Client-side checks do not enforce security. Server-side protections must be independently audited. The supplied SECURITY_AUDIT_READ_ONLY.sql only inspects current permissions. Do not treat this version as production ready, and do not accept payments through the app.

Test: sign in, check active listing, check accepted and declined offers, check completed sales. Do NOT click Mark record sold unless you intend to change real test data.
