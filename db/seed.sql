/* branches */
INSERT INTO branches (code, name) VALUES
  ('RAK',  'Ras Al Khaimah'),
  ('ALN',  'Al Nazr'),
  ('AFW',  'Afwaj');

/* users (password = "pass" hashed with bcrypt) */
INSERT INTO users (username, password, role, branch_id) VALUES
  ('rak_user',  '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'BRANCH', 1),
  ('viewer',    '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'VIEWER', NULL),
  ('admin',     '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'ADMIN',  NULL);
