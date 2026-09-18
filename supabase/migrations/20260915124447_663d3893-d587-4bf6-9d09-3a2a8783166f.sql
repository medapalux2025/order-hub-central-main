ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_pages;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.landing_pages REPLICA IDENTITY FULL;