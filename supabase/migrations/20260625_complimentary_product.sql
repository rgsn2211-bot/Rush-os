-- Add product reference and worker delete policy to complimentary_logs

ALTER TABLE complimentary_logs
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

-- Workers can delete their own pending logs
CREATE POLICY complimentary_worker_delete ON complimentary_logs
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'needs_review'
  );

-- Workers need to read products for the complimentary product picker
CREATE POLICY products_worker_select ON products
  FOR SELECT USING (true);
