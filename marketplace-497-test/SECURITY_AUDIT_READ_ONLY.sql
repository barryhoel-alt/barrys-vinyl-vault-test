-- VINYL VAULT MARKETPLACE 4.9.6 — READ-ONLY SECURITY AUDIT
-- Run in Supabase SQL Editor only if you wish to review security settings.
-- This script does not modify tables, functions, policies or user data.
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'marketplace_%' ORDER BY tablename;
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'marketplace_%' ORDER BY tablename, policyname;
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments, p.prosecdef AS security_definer, p.proconfig AS settings, has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute, has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'marketplace_%' ORDER BY p.proname;
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name LIKE 'marketplace_%' AND grantee IN ('anon','authenticated') ORDER BY table_name,grantee,privilege_type;
SELECT table_name,column_name,grantee,privilege_type FROM information_schema.column_privileges WHERE table_schema='public' AND table_name LIKE 'marketplace_%' AND grantee IN ('anon','authenticated') ORDER BY table_name,column_name,grantee;
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid::regclass::text LIKE 'marketplace_%' ORDER BY 1,2;
