CREATE OR REPLACE FUNCTION public.track_landing_page_visit(_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v integer;
BEGIN
  UPDATE public.landing_pages
     SET visits = visits + 1
   WHERE slug = _slug AND is_active = true
  RETURNING visits INTO v;
  RETURN v;
END; $$;

REVOKE ALL ON FUNCTION public.track_landing_page_visit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_landing_page_visit(text) TO service_role;