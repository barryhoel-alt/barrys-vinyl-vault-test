Vinyl Vault Marketplace 4.9.8 TEST

Upload all marketplace HTML/JS files into a NEW marketplace-498-test GitHub folder. Keep 4.9.7 intact.

Adds an in-app notification bell for incoming offers, counteroffers, accepted/declined offers and recorded sales. Uses existing authenticated marketplace data; no Supabase migration required.

IMPORTANT LIMITATIONS:
- Read/unread status is stored per user in this browser only; it does not sync across devices.
- On first use, existing activity is marked read to avoid flooding the bell. New offer statuses appear unread after the next dashboard refresh (roughly every 60 seconds).
- Status-derived notifications cannot reliably reconstruct every past intermediate change; they are not a durable event history.
- No push, email or SMS notifications. No payment processing.

TEST: sign in as buyer/seller, create new test offer, refresh after response, check bell and View dashboard navigation.
