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

CREATE TABLE dcr_header (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  dcr_number VARCHAR(32) NOT NULL,
  dcr_date DATE NOT NULL,
  status ENUM('DRAFT','SUBMITTED','ACCEPTED','REJECTED') DEFAULT 'DRAFT',
  reject_reason VARCHAR(255),
  created_by INT,
  updated_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

ALTER TABLE dcr_header ADD UNIQUE KEY uniq_branch_date (branch_id, dcr_date);

CREATE TABLE dcr_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dcr_id INT NOT NULL,
  field_key VARCHAR(64) NOT NULL,
  value_text VARCHAR(255),
  FOREIGN KEY (dcr_id) REFERENCES dcr_header(id)
);
