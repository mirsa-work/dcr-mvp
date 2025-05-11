CREATE TABLE branches (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL
);

CREATE TABLE users (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password CHAR(60) NOT NULL,
  role     ENUM('BRANCH','VIEWER','ADMIN') NOT NULL,
  branch_id INT NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE contract_categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(16) UNIQUE,
  name VARCHAR(64),
  uom  ENUM('per-meal','per-day')
);

CREATE TABLE customers (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(16) UNIQUE,
  name VARCHAR(64),
  is_pseudo TINYINT(1) DEFAULT 0
);

/* ─── forms / groups / fields ─────────────── */
CREATE TABLE forms (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to   DATE NULL,
  created_at DATETIME,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE form_groups (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  form_id    INT NOT NULL,
  sort_order INT,
  label      VARCHAR(64),
  FOREIGN KEY (form_id) REFERENCES forms(id)
);

CREATE TABLE form_fields (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  form_id      INT NOT NULL,
  group_id     INT NULL,
  customer_id  INT NULL,
  category_id  INT NULL,
  key_code     VARCHAR(32),
  label        VARCHAR(64),
  data_type    ENUM('integer','decimal','date'),
  required     TINYINT(1),
  sort_order   INT,
  FOREIGN KEY (form_id)     REFERENCES forms(id),
  FOREIGN KEY (group_id)    REFERENCES form_groups(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (category_id) REFERENCES contract_categories(id),
  /* ensure grouped field belongs to same form */
  CONSTRAINT fk_group_same_form
    FOREIGN KEY (form_id, group_id)
    REFERENCES form_groups(form_id,id)
);

/* ─── contracts / rates ───────────────────── */
CREATE TABLE contracts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  branch_id   INT NOT NULL,
  customer_id INT NOT NULL,
  valid_from  DATE NOT NULL,
  valid_to    DATE NULL,
  created_at  DATETIME,
  FOREIGN KEY (branch_id)  REFERENCES branches(id),
  FOREIGN KEY (customer_id)REFERENCES customers(id)
);

CREATE TABLE contract_rates (
  contract_id INT,
  category_id INT,
  rate        DECIMAL(10,2),
  uom         ENUM('per-meal','per-day'),
  PRIMARY KEY (contract_id, category_id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (category_id) REFERENCES contract_categories(id)
);

CREATE TABLE dcr_header (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  form_id INT,
  dcr_number VARCHAR(32) NOT NULL,
  dcr_date DATE NOT NULL,
  status ENUM('DRAFT','SUBMITTED','ACCEPTED','REJECTED') DEFAULT 'DRAFT',
  reject_reason VARCHAR(255),
  created_by INT,
  updated_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_branch_date (branch_id, dcr_date),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (form_id) REFERENCES forms(id)
);

CREATE TABLE dcr_values (
  dcr_id   INT,
  field_id INT,
  value_num DECIMAL(15,2),
  PRIMARY KEY (dcr_id, field_id),
  FOREIGN KEY (dcr_id)   REFERENCES dcr_header(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES form_fields(id)
);

CREATE TABLE dcr_contracts (
  dcr_id      INT,
  customer_id INT,
  contract_id INT,
  revenue     DECIMAL(15,2),
  PRIMARY KEY (dcr_id, customer_id),
  FOREIGN KEY (dcr_id)      REFERENCES dcr_header(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);
