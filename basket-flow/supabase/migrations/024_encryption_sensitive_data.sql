-- Migration: Encryption for sensitive data
-- Adds pgcrypto and encrypted columns for license numbers and medical documents
-- Uses pgp_sym_encrypt/pgp_sym_decrypt with a vault-stored key

-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add encrypted column for player_licenses.license_number
-- We keep the original column for reads during migration, then backfill.
ALTER TABLE player_licenses
  ADD COLUMN IF NOT EXISTS license_number_encrypted BYTEA;

-- Backfill encrypted values from existing license_number
UPDATE player_licenses
SET license_number_encrypted = pgp_sym_encrypt(
  license_number,
  COALESCE(current_setting('app.encryption_key', true), 'default-dev-key-change-in-prod')
)
WHERE license_number IS NOT NULL
  AND license_number_encrypted IS NULL;

-- 3. Add encrypted column for documents.sensitive_data (medical records, etc.)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sensitive_data_encrypted BYTEA;

-- 4. Create helper functions for encrypt/decrypt
-- These read the encryption key from Supabase Vault (production) or a setting (dev)
CREATE OR REPLACE FUNCTION encrypt_value(plain_text TEXT)
RETURNS BYTEA
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT pgp_sym_encrypt(
    plain_text,
    COALESCE(current_setting('app.encryption_key', true), 'default-dev-key-change-in-prod')
  );
$$;

CREATE OR REPLACE FUNCTION decrypt_value(cipher_text BYTEA)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT pgp_sym_decrypt(
    cipher_text,
    COALESCE(current_setting('app.encryption_key', true), 'default-dev-key-change-in-prod')
  );
$$;

-- 5. Create a view that exposes decrypted license numbers (for authorized queries)
CREATE OR REPLACE VIEW v_player_licenses_decrypted AS
SELECT
  id,
  player_id,
  federation,
  license_number_encrypted,
  CASE
    WHEN license_number_encrypted IS NOT NULL
    THEN pgp_sym_decrypt(
      license_number_encrypted,
      COALESCE(current_setting('app.encryption_key', true), 'default-dev-key-change-in-prod')
    )
    ELSE license_number
  END AS license_number,
  season,
  status,
  expires_at,
  created_at
FROM player_licenses;

-- 6. Add RLS policy for encrypted view
ALTER VIEW v_player_licenses_decrypted SET (security_invoker = true);

-- 7. Create index on encrypted columns for lookup (if needed)
-- Note: encrypted columns cannot be indexed for range queries;
-- this index is for existence checks only.
CREATE INDEX IF NOT EXISTS idx_player_licenses_encrypted
  ON player_licenses (player_id)
  WHERE license_number_encrypted IS NOT NULL;

-- 8. Grant access
GRANT SELECT ON v_player_licenses_decrypted TO authenticated;

-- Note: In production, store the encryption key in Supabase Vault:
--   select vault.create_secret('app-encryption-key', '<your-256-bit-key>');
--   Then: SET app.encryption_key = vault.decrypted_secret('app-encryption-key');
-- The COALESCE fallback above is for local dev only.
