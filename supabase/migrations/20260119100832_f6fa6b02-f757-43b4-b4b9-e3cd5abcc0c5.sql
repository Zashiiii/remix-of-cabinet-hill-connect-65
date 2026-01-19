-- Insert default admin user (only if no admin exists)
-- Password: Admin123 (bcrypt hashed)
INSERT INTO public.staff_users (username, password_hash, full_name, role, is_active, created_at, updated_at)
SELECT 
  'admin',
  '$2a$10$rMpMdxNQHgXWYDf3zGD1wOaD8L5fGjqPEsIBp0QJ8k5Y6wv3tH2S',
  'System Administrator',
  'admin',
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_users WHERE username = 'admin'
);