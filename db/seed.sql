/* branches */
INSERT INTO branches (code, name) VALUES
  ('RAK',  'Ras Al Khaimah'),
  ('ALN',  'Al Nazr'),
  ('AFW',  'Afwaj');

/* users (password = "pass" hashed with bcrypt) */
INSERT INTO users (username, password, role, branch_id) VALUES
  ('rak_user',  '$2b$10$9zY23TUx3LjRcDFEag9SseSnERbtfaz8E0H2PbQmKEzFJZ3y8SjwW', 'BRANCH', 1),
  ('viewer',    '$2b$10$9zY23TUx3LjRcDFEag9SseSnERbtfaz8E0H2PbQmKEzFJZ3y8SjwW', 'VIEWER', NULL),
  ('admin',     '$2b$10$9zY23TUx3LjRcDFEag9SseSnERbtfaz8E0H2PbQmKEzFJZ3y8SjwW', 'ADMIN',  NULL);
