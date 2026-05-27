
INSERT INTO storage.buckets (id, name, public) VALUES ('propostas', 'propostas', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Propostas public read" ON storage.objects FOR SELECT USING (bucket_id = 'propostas');
CREATE POLICY "Propostas public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'propostas');
