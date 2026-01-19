-- Fix default admin password hash so it matches bcrypt in staff-auth
-- Uses pgcrypto's bcrypt (Blowfish) hashing to generate a valid bcrypt hash in-SQL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE public.staff_users
SET
  password_hash = crypt('Admin123', gen_salt('bf', 10)),
  updated_at = now()
WHERE username = 'admin';