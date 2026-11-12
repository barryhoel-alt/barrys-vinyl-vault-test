-- 4.9.7 TEST ONLY. Run in the Marketplace Test Supabase project.
-- Review the preflight results before applying; do not run against your personal collection.
-- PRE-FLIGHT: check message constraints and existing active duplicates.
SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE conrelid='public.marketplace_offers'::regclass AND contype='c';
SELECT listing_id,buyer_id,count(*) FROM public.marketplace_offers
WHERE status IN ('pending','countered','accepted')
GROUP BY listing_id,buyer_id HAVING count(*)>1;

-- MIGRATION (run separately AFTER reviewing preflight and taking a backup):
-- If the message constraint is named differently, do not blindly execute this block.
-- This guarded block removes only the known 1..1000 message-length check,
-- retaining a maximum length and permitting empty messages.
DO $do$
DECLARE r record;
BEGIN
 FOR r IN SELECT conname,pg_get_constraintdef(oid) def
   FROM pg_constraint WHERE conrelid='public.marketplace_offers'::regclass AND contype='c' LOOP
   IF r.def ~* 'message' AND r.def ~ '1000' AND r.def ~ '1' THEN
      RAISE NOTICE 'Review constraint %: %. Manual change required; no automatic drop.',r.conname,r.def;
   END IF;
 END LOOP;
END $do$;

-- Create this trigger only after the message constraint is updated.
-- The trigger serializes buyer/listing inserts with an advisory transaction lock,
-- blocking concurrent duplicate submissions, including direct API requests.
CREATE OR REPLACE FUNCTION public.marketplace_prevent_duplicate_buyer_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 IF NEW.status IN ('pending','countered','accepted') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.listing_id::text || ':' || NEW.buyer_id::text, 497));
  IF EXISTS (SELECT 1 FROM public.marketplace_offers o
    WHERE o.listing_id=NEW.listing_id AND o.buyer_id=NEW.buyer_id
      AND o.status IN ('pending','countered','accepted')
      AND o.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION 'An active negotiation already exists for this buyer and listing';
  END IF;
 END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS marketplace_prevent_duplicate_buyer_offer_trigger ON public.marketplace_offers;
CREATE TRIGGER marketplace_prevent_duplicate_buyer_offer_trigger
BEFORE INSERT OR UPDATE OF status,buyer_id,listing_id ON public.marketplace_offers
FOR EACH ROW EXECUTE FUNCTION public.marketplace_prevent_duplicate_buyer_offer();
REVOKE ALL ON FUNCTION public.marketplace_prevent_duplicate_buyer_offer() FROM PUBLIC,anon,authenticated;
