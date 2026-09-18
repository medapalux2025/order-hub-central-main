-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','staff');
CREATE TYPE public.order_status AS ENUM ('new','confirmed','preparing','shipped','delivered','cancelled','returned');
CREATE TYPE public.customer_status AS ENUM ('active','vip','blocked');

-- UPDATED_AT helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- NEW USER TRIGGER: profile + role (first user becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN user_count = 0 THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sku TEXT UNIQUE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10,2) CHECK (compare_at_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_staff_all" ON public.products FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_products_active ON public.products(is_active);

-- LANDING PAGES
CREATE TABLE public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landing_pages_staff_all" ON public.landing_pages FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER landing_pages_updated_at BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_landing_pages_product ON public.landing_pages(product_id);

-- CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  city TEXT,
  address TEXT,
  status public.customer_status NOT NULL DEFAULT 'active',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_staff_all" ON public.customers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1001;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number INTEGER NOT NULL UNIQUE DEFAULT nextval('public.order_number_seq'),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  address TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  status public.order_status NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'organic',
  campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER SEQUENCE public.order_number_seq OWNED BY public.orders.order_number;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_staff_all" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_product ON public.orders(product_id);
CREATE INDEX idx_orders_landing_page ON public.orders(landing_page_id);
CREATE INDEX idx_orders_phone ON public.orders(phone);
CREATE INDEX idx_orders_city ON public.orders(city);
CREATE INDEX idx_orders_source ON public.orders(source);

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_staff_all" ON public.order_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- ORDER STATUS HISTORY
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_status_history_staff_select" ON public.order_status_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "order_status_history_staff_insert" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_order_status_history_order ON public.order_status_history(order_id, created_at DESC);

-- STATUS HISTORY TRIGGER
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_status_history AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- CUSTOMER AGGREGATES TRIGGER
CREATE OR REPLACE FUNCTION public.refresh_customer_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  IF cid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.customers c SET
    total_orders = sub.cnt,
    total_spent = sub.total,
    last_order_at = sub.last_at
  FROM (
    SELECT count(*) AS cnt,
           COALESCE(sum(total_price) FILTER (WHERE status NOT IN ('cancelled','returned')),0) AS total,
           max(created_at) AS last_at
    FROM public.orders WHERE customer_id = cid
  ) sub
  WHERE c.id = cid;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER orders_customer_stats AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.refresh_customer_stats();

-- REALTIME
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- SEED DATA
INSERT INTO public.products (id, name, slug, description, image_url, sku, price, compare_at_price, stock_quantity, is_active) VALUES
('11111111-1111-1111-1111-111111111101','USB Coran','usb-quran','Clé USB contenant le Saint Coran complet récité par les plus grands récitateurs.','https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&q=80','USB-QRN-01',139.00,199.00,320,true),
('11111111-1111-1111-1111-111111111102','USB Coran Premium','usb-quran-premium','Version premium 64 Go avec tafsir, traduction française et coffret cadeau.','https://images.unsplash.com/photo-1584286595398-a59f21d313f5?w=800&q=80','USB-QRN-PRM',249.00,349.00,140,true),
('11111111-1111-1111-1111-111111111103','Montre Connectée Pro','montre-connectee-pro','Montre connectée avec suivi cardiaque, notifications et autonomie 7 jours.','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80','WATCH-PRO',399.00,599.00,85,true),
('11111111-1111-1111-1111-111111111104','Diffuseur Aroma','diffuseur-aroma','Diffuseur d''huiles essentielles ultrasonique 300 ml avec LED.','https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800&q=80','AROMA-300',179.00,249.00,210,true),
('11111111-1111-1111-1111-111111111105','Épilateur Laser IPL','epilateur-ipl','Épilateur lumière pulsée 999 000 flashs, 5 niveaux d''intensité.','https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80','IPL-999',549.00,799.00,42,true);

INSERT INTO public.landing_pages (id, name, slug, product_id, url, is_active, visits) VALUES
('22222222-2222-2222-2222-222222222201','USB Coran - Offre Ramadan','usb-quran','11111111-1111-1111-1111-111111111101','https://landing.example.ma/usb-quran',true,18400),
('22222222-2222-2222-2222-222222222202','USB Coran Premium','usb-quran-premium','11111111-1111-1111-1111-111111111102','https://landing.example.ma/usb-premium',true,9200),
('22222222-2222-2222-2222-222222222203','Montre Connectée Pro','montre-pro','11111111-1111-1111-1111-111111111103','https://landing.example.ma/montre-pro',true,12750),
('22222222-2222-2222-2222-222222222204','Diffuseur Aroma','diffuseur','11111111-1111-1111-1111-111111111104','https://landing.example.ma/diffuseur',true,6100),
('22222222-2222-2222-2222-222222222205','Épilateur IPL','epilateur-ipl','11111111-1111-1111-1111-111111111105','https://landing.example.ma/ipl',false,3050);

INSERT INTO public.customers (id, full_name, phone, city, address, status) VALUES
('33333333-3333-3333-3333-333333333301','Ahmed Bennani','0612345678','Marrakech','Rue Ibn Sina 24, Gueliz','active'),
('33333333-3333-3333-3333-333333333302','Fatima Zahra El Idrissi','0655112233','Casablanca','Bd Zerktouni 108, Maarif','vip'),
('33333333-3333-3333-3333-333333333303','Youssef Amrani','0661778899','Rabat','Avenue Hassan II 45, Agdal','active'),
('33333333-3333-3333-3333-333333333304','Salma Ouazzani','0670445566','Fès','Lot Al Adarissa 12','active'),
('33333333-3333-3333-3333-333333333305','Mehdi Tazi','0699332211','Tanger','Rue de Belgique 7','active'),
('33333333-3333-3333-3333-333333333306','Khadija Alaoui','0644556677','Agadir','Hay Mohammadi, Bloc C 33','active'),
('33333333-3333-3333-3333-333333333307','Omar Sbai','0688990011','Marrakech','Massira 1, N 210','active'),
('33333333-3333-3333-3333-333333333308','Nadia Chraibi','0622334455','Casablanca','Ain Diab, Res. Al Manar','vip');

INSERT INTO public.orders (customer_id, product_id, landing_page_id, customer_name, phone, city, address, quantity, unit_price, total_price, status, source, campaign, utm_source, utm_medium, utm_campaign, utm_content, notes, created_at) VALUES
('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201','Ahmed Bennani','0612345678','Marrakech','Rue Ibn Sina 24, Gueliz',1,139.00,139.00,'delivered','facebook','usb_campaign_01','facebook','paid','usb_campaign_01','video_01','Livrer avant 18h', now() - interval '21 days'),
('33333333-3333-3333-3333-333333333302','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222202','Fatima Zahra El Idrissi','0655112233','Casablanca','Bd Zerktouni 108, Maarif',2,249.00,498.00,'delivered','instagram','usb_premium_ig','instagram','paid','usb_premium_ig','carousel_02',NULL, now() - interval '18 days'),
('33333333-3333-3333-3333-333333333303','11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222203','Youssef Amrani','0661778899','Rabat','Avenue Hassan II 45, Agdal',1,399.00,399.00,'shipped','tiktok','watch_tt_03','tiktok','paid','watch_tt_03','ugc_03',NULL, now() - interval '9 days'),
('33333333-3333-3333-3333-333333333304','11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222204','Salma Ouazzani','0670445566','Fès','Lot Al Adarissa 12',1,179.00,179.00,'preparing','facebook','aroma_fb_01','facebook','paid','aroma_fb_01','image_01',NULL, now() - interval '6 days'),
('33333333-3333-3333-3333-333333333305','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201','Mehdi Tazi','0699332211','Tanger','Rue de Belgique 7',3,139.00,417.00,'confirmed','facebook','usb_campaign_01','facebook','paid','usb_campaign_01','video_02','Cadeau', now() - interval '4 days'),
('33333333-3333-3333-3333-333333333306','11111111-1111-1111-1111-111111111105','22222222-2222-2222-2222-222222222205','Khadija Alaoui','0644556677','Agadir','Hay Mohammadi, Bloc C 33',1,549.00,549.00,'cancelled','tiktok','ipl_tt_01','tiktok','paid','ipl_tt_01','ugc_07','Client injoignable', now() - interval '3 days'),
('33333333-3333-3333-3333-333333333307','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201','Omar Sbai','0688990011','Marrakech','Massira 1, N 210',1,139.00,139.00,'new','organic',NULL,NULL,NULL,NULL,NULL,NULL, now() - interval '2 days'),
('33333333-3333-3333-3333-333333333308','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222202','Nadia Chraibi','0622334455','Casablanca','Ain Diab, Res. Al Manar',1,249.00,249.00,'new','instagram','usb_premium_ig','instagram','paid','usb_premium_ig','story_01',NULL, now() - interval '1 day'),
('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222204','Ahmed Bennani','0612345678','Marrakech','Rue Ibn Sina 24, Gueliz',2,179.00,358.00,'confirmed','facebook','aroma_fb_01','facebook','paid','aroma_fb_01','video_04',NULL, now() - interval '12 hours'),
('33333333-3333-3333-3333-333333333303','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201','Youssef Amrani','0661778899','Rabat','Avenue Hassan II 45, Agdal',1,139.00,139.00,'new','facebook','usb_campaign_01','facebook','paid','usb_campaign_01','video_01',NULL, now() - interval '3 hours'),
('33333333-3333-3333-3333-333333333305','11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222203','Mehdi Tazi','0699332211','Tanger','Rue de Belgique 7',1,399.00,399.00,'returned','tiktok','watch_tt_03','tiktok','paid','watch_tt_03','ugc_01','Retour produit', now() - interval '14 days'),
('33333333-3333-3333-3333-333333333306','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222202','Khadija Alaoui','0644556677','Agadir','Hay Mohammadi, Bloc C 33',1,249.00,249.00,'delivered','organic',NULL,NULL,NULL,NULL,NULL,NULL, now() - interval '28 days');

INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
SELECT o.id, o.product_id, p.name, o.quantity, o.unit_price, o.total_price
FROM public.orders o JOIN public.products p ON p.id = o.product_id;