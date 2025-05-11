/* branches */
INSERT INTO branches (code, name) VALUES
  ('RAK',  'Afwaj / ALEC RAK'),
  ('AMR', 'Al Mariah Ruwaiz'),
  ('ALNAZR', 'Al Nazr'),
  ('CENT', 'Central Kitchen'),
  ('CORP', 'Corporate Kitchen');

/* users (password = "pass" hashed with bcrypt) */
INSERT INTO users (username, password, role, branch_id) VALUES
  ('rak_user',  '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'BRANCH', (SELECT id FROM branches WHERE code = 'RAK')),
  ('amr_user',  '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'BRANCH', (SELECT id FROM branches WHERE code = 'AMR')),
  ('alnazr_user',  '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'BRANCH', (SELECT id FROM branches WHERE code = 'ALNAZR')),
  ('cent_user',  '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'BRANCH', (SELECT id FROM branches WHERE code = 'CENT')),
  ('corp_user',  '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'BRANCH', (SELECT id FROM branches WHERE code = 'CORP')),
  ('viewer',    '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'VIEWER', NULL),
  ('admin',     '$2b$10$amhzyKTicDn9U.lPepyn3.b0nLBTayHY4l2KYGW9CRNo1MkcXlqeC', 'ADMIN',  NULL);

/*  customers  */
INSERT INTO customers(code,name,is_pseudo) VALUES
 ('MODUTEC', 'Modutec',0),
 ('ADCOOP','Abu Dhabi Co-op',0),
 ('ADNOC','ADNOC',0),
 ('OUMULAT','Oumulat',0),
 ('TECHNICAS','Technicas',0),
 ('ADMA','ADMA',0),
 ('ASTRA','Astra',0),
 ('ALMRWZ','Al Mariah Ruwaiz',0),
 ('ALNAZR','Al Nazr',0),
 ('WESTCAT', 'Western Catering', 0),
 /* pseudo buckets */
 ('INHOUSE','In-house sale',1),
 ('PARCEL','Parcel Count',1),
 ('CANTEEN','Canteen sale',1),
 ('MESS','Mess',1),
 ('AGGR','Aggregator',1);

/*  contract_categories */
INSERT INTO contract_categories(code,name,uom) VALUES
 ('MEALDAY','Mealday','per-day'),
 ('MEALDAY_SNR','Mealday - Senior','per-day'),
 ('MEALDAY_JNR','Mealday - Junior','per-day'),
 ('MEALDAY_LAB','Mealday - Labourer','per-day'),
 ('BREAKFAST','Breakfast','per-meal'),
 ('LUNCH','Lunch','per-meal'),
 ('DINNER','Dinner','per-meal'),
 ('BREAKFAST_SNR','Breakfast - Senior','per-meal'),
 ('BREAKFAST_JNR','Breakfast - Junior','per-meal'),
 ('BREAKFAST_LAB','Breakfast - Labourer','per-meal'),
 ('LUNCH_SNR','Lunch - Senior','per-meal'),
 ('LUNCH_JNR','Lunch - Junior','per-meal'),
 ('LUNCH_LAB','Lunch - Labourer','per-meal'),
 ('DINNER_SNR','Dinner - Senior','per-meal'),
 ('DINNER_JNR','Dinner - Junior','per-meal'),
 ('DINNER_LAB','Dinner - Labourer','per-meal'),
 ('PARCEL_BF','Parcel Breakfast','per-meal'),
 ('PARCEL_LN','Parcel Lunch','per-meal'),
 ('PARCEL_DN','Parcel Dinner','per-meal'),
 ('PARCEL_SNR','Parcel Senior','per-day'),
 ('PARCEL_JNR','Parcel Junior','per-day'),
 ('PARCEL_LAB','Parcel Labourer','per-day');

/* ─── FEB-2025 forms & contracts ───── */
/* Create one form per branch */
INSERT INTO forms(branch_id,valid_from)
SELECT id,'2025-02-01' FROM branches;

/* Example for Central Kitchen (branch code = CENT) */
SET @CENT := (SELECT id FROM branches WHERE code='CENT');
SET @CENT_FORM := (SELECT id FROM forms WHERE branch_id=@CENT AND valid_from='2025-02-01');

/* groups */
INSERT INTO form_groups(form_id,sort_order,label) VALUES
 (@CENT_FORM,1,'Modutec'),
 (@CENT_FORM,2,'Abu Dhabi Co-op'),
 (@CENT_FORM,99,'Stock');

/* capture group ids */
SET @G1 := (SELECT id FROM form_groups WHERE form_id=@CENT_FORM AND label='Modutec');
SET @G2 := (SELECT id FROM form_groups WHERE form_id=@CENT_FORM AND label='Abu Dhabi Co-op');
SET @GSTOCK := (SELECT id FROM form_groups WHERE form_id=@CENT_FORM AND label='Stock');

/* fields */
INSERT INTO form_fields(form_id,group_id,customer_id,category_id,key_code,label,data_type,required,sort_order) VALUES
 (@CENT_FORM,NULL,NULL,NULL,'date','Date','date',1,1),
 (@CENT_FORM,NULL,NULL,NULL,'consumption','Consumption','decimal',1,2),
 (@CENT_FORM,@G1,(SELECT id FROM customers WHERE code='MODUTEC'),
   (SELECT id FROM contract_categories WHERE code='BREAKFAST'),'mod_bf','Breakfast','integer',0,1),
 (@CENT_FORM,@G1,(SELECT id FROM customers WHERE code='MODUTEC'),
   (SELECT id FROM contract_categories WHERE code='LUNCH'),'mod_ln','Lunch','integer',0,2),
 (@CENT_FORM,@G1,(SELECT id FROM customers WHERE code='MODUTEC'),
   (SELECT id FROM contract_categories WHERE code='DINNER'),'mod_dn','Dinner','integer',0,3),
 (@CENT_FORM,@G2,(SELECT id FROM customers WHERE code='ADCOOP'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY'),'coop_md','Mealday','integer',0,1),
 (@CENT_FORM,@GSTOCK,NULL,NULL,'opening_stock','Opening Stock','decimal',1,1),
 (@CENT_FORM,@GSTOCK,NULL,NULL,'purchase','Purchase','decimal',1,2),
 (@CENT_FORM,@GSTOCK,NULL,NULL,'purchase_rtn','Purchase Return','decimal',1,3),
 (@CENT_FORM,@GSTOCK,NULL,NULL,'transfer_in','Transfer In','decimal',1,4),
 (@CENT_FORM,@GSTOCK,NULL,NULL,'transfer_out','Transfer Out','decimal',1,5),
 (@CENT_FORM,@GSTOCK,NULL,NULL,'closing_stock','Closing Stock','decimal',1,6)
;

/* contracts & rates – Central + Modutec */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@CENT,(SELECT id FROM customers WHERE code='MODUTEC'),'2025-02-01');
SET @CENT_MOD_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@CENT_MOD_CON,(SELECT id FROM contract_categories WHERE code='BREAKFAST'),3.6,'per-meal'),
 (@CENT_MOD_CON,(SELECT id FROM contract_categories WHERE code='LUNCH'),7.2,'per-meal'),
 (@CENT_MOD_CON,(SELECT id FROM contract_categories WHERE code='DINNER'),7.2,'per-meal');

/* contracts & rates – Central + ADCOOP */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@CENT,(SELECT id FROM customers WHERE code='ADCOOP'),'2025-02-01');
SET @CENT_ADCOOP_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@CENT_ADCOOP_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY'),16,'per-day');
