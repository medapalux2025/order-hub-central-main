-- API keys for external landing pages + request audit log

-- Ensure pgcrypto is available for key generation and hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;

CREATE INDEX IF NOT EXISTS idx_landing_pages_api_key_hash
  ON public.landing_pages(api_key_hash);

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  api_key_hash TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  ip TEXT,
  origin TEXT,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_key_created
  ON public.api_request_logs(api_key_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_landing_page
  ON public.api_request_logs(landing_page_id, created_at DESC);

-- Generates a secure API key for a landing page, stores its SHA-256 hash,
-- and returns the plaintext key exactly once.
CREATE OR REPLACE FUNCTION public.generate_landing_page_api_key(_landing_page_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_plain TEXT;
  key_hash TEXT;
BEGIN
  key_plain := 'oh_live_' || encode(gen_random_bytes(24), 'hex');
  key_hash := encode(digest(key_plain, 'sha256'), 'hex');

  UPDATE public.landing_pages
  SET
    api_key_hash = key_hash,
    api_key_prefix = left(key_plain, 12),
    updated_at = now()
  WHERE id = _landing_page_id
    AND api_key_hash IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'landing page not found or already has an api key';
  END IF;

  RETURN key_plain;
END;
$$;
