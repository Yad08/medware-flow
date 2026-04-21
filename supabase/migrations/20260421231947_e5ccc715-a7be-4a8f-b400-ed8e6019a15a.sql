-- Reset to only the two demo users with the new PINs
DELETE FROM public.app_users;

INSERT INTO public.app_users (role, display_name, pin_code, is_active)
VALUES
  ('employee', 'Employee', '2468', true),
  ('volunteer', 'Volunteer', '1357', true);