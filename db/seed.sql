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





/* Corporate Kitchen (branch code = CORP) */
SET @CORP := (SELECT id FROM branches WHERE code='CORP');
SET @CORP_FORM := (SELECT id FROM forms WHERE branch_id=@CORP AND valid_from='2025-02-01');

/* groups */
INSERT INTO form_groups(form_id,sort_order,label) VALUES
 (@CORP_FORM,1,'ADNOC'),
 (@CORP_FORM,2,'Oumulat'),
 (@CORP_FORM,3,'Technicas'),
 (@CORP_FORM,4,'ADMA'),
 (@CORP_FORM,5,'In house'),
 (@CORP_FORM,99,'Stock');

/* capture group ids */
SET @G1 := (SELECT id FROM form_groups WHERE form_id=@CORP_FORM AND label='ADNOC');
SET @G2 := (SELECT id FROM form_groups WHERE form_id=@CORP_FORM AND label='Oumulat');
SET @G3 := (SELECT id FROM form_groups WHERE form_id=@CORP_FORM AND label='Technicas');
SET @G4 := (SELECT id FROM form_groups WHERE form_id=@CORP_FORM AND label='ADMA');
SET @G5 := (SELECT id FROM form_groups WHERE form_id=@CORP_FORM AND label='In house');
SET @GSTOCK := (SELECT id FROM form_groups WHERE form_id=@CORP_FORM AND label='Stock');

/* fields */
INSERT INTO form_fields(form_id,group_id,customer_id,category_id,key_code,label,data_type,required,sort_order) VALUES
 (@CORP_FORM,NULL,NULL,NULL,'date','Date','date',1,1),
 (@CORP_FORM,NULL,NULL,NULL,'consumption','Consumption','decimal',1,2),
 (@CORP_FORM,@G1,(SELECT id FROM customers WHERE code='ADNOC'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY'),'adnoc_md','Mealday','integer',0,1),
 (@CORP_FORM,@G2,(SELECT id FROM customers WHERE code='OUMULAT'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY'),'oum_md','Mealday','integer',0,1),
 (@CORP_FORM,@G3,(SELECT id FROM customers WHERE code='TECHNICAS'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY'),'tech_md','Mealday','integer',0,1),
 (@CORP_FORM,@G4,(SELECT id FROM customers WHERE code='ADMA'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY'),'adma_md','Mealday','integer',0,1),
 (@CORP_FORM,@G5,(SELECT id FROM customers WHERE code='INHOUSE'),
   NULL,'inhouse','Amount','decimal',0,1),
 (@CORP_FORM,@GSTOCK,NULL,NULL,'opening_stock','Opening Stock','decimal',1,1),
 (@CORP_FORM,@GSTOCK,NULL,NULL,'purchase','Purchase','decimal',1,2),
 (@CORP_FORM,@GSTOCK,NULL,NULL,'purchase_rtn','Purchase Return','decimal',1,3),
 (@CORP_FORM,@GSTOCK,NULL,NULL,'transfer_in','Transfer In','decimal',1,4),
 (@CORP_FORM,@GSTOCK,NULL,NULL,'transfer_out','Transfer Out','decimal',1,5),
 (@CORP_FORM,@GSTOCK,NULL,NULL,'closing_stock','Closing Stock','decimal',1,6)
;

/* contracts & rates – CORP + ADNOC */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@CORP,(SELECT id FROM customers WHERE code='ADNOC'),'2025-02-01');
SET @CORP_ADNOC_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@CORP_ADNOC_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY'),50,'per-day');

/* contracts & rates – CORP + Oumulat */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@CORP,(SELECT id FROM customers WHERE code='OUMULAT'),'2025-02-01');
SET @CORP_OUMULAT_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@CORP_OUMULAT_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY'),20,'per-day');

/* contracts & rates – CORP + Technicas */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@CORP,(SELECT id FROM customers WHERE code='TECHNICAS'),'2025-02-01');
SET @CORP_TECHNICAS_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@CORP_TECHNICAS_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY'),30,'per-day');

/* contracts & rates – CORP + ADMA */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@CORP,(SELECT id FROM customers WHERE code='ADMA'),'2025-02-01');
SET @CORP_ADMA_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@CORP_ADMA_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY'),40,'per-day');






 /* Al Mariah Ruwaiz (branch code = AMR) */
SET @AMR := (SELECT id FROM branches WHERE code='AMR');
SET @AMR_FORM := (SELECT id FROM forms WHERE branch_id=@AMR AND valid_from='2025-02-01');

/* groups */
INSERT INTO form_groups(form_id,sort_order,label) VALUES
 (@AMR_FORM,1,'Al Mariah Ruwaiz'),
 (@AMR_FORM,2,'Astra'),
 (@AMR_FORM,3,'Parcel Count'),
 (@AMR_FORM,99,'Stock');

/* capture group ids */
SET @G1 := (SELECT id FROM form_groups WHERE form_id=@AMR_FORM AND label='Al Mariah Ruwaiz');
SET @G2 := (SELECT id FROM form_groups WHERE form_id=@AMR_FORM AND label='Astra');
SET @G3 := (SELECT id FROM form_groups WHERE form_id=@AMR_FORM AND label='Parcel Count');
SET @GSTOCK := (SELECT id FROM form_groups WHERE form_id=@AMR_FORM AND label='Stock');

/* fields */
INSERT INTO form_fields(form_id,group_id,customer_id,category_id,key_code,label,data_type,required,sort_order) VALUES
 (@AMR_FORM,NULL,NULL,NULL,'date','Date','date',1,1),
 (@AMR_FORM,NULL,NULL,NULL,'consumption','Consumption','decimal',1,2),
 
 /* Al Mariah Ruwaiz fields */
 (@AMR_FORM,@G1,(SELECT id FROM customers WHERE code='ALMRWZ'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_SNR'),'amr_snr','Senior','integer',0,1),
 (@AMR_FORM,@G1,(SELECT id FROM customers WHERE code='ALMRWZ'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_JNR'),'amr_jnr','Junior','integer',0,2),
 (@AMR_FORM,@G1,(SELECT id FROM customers WHERE code='ALMRWZ'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_LAB'),'amr_lab','Labourer','integer',0,3),
 
 /* Astra fields */
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='BREAKFAST_SNR'),'astra_bf_snr','Breakfast - Senior','integer',0,1),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='BREAKFAST_JNR'),'astra_bf_jnr','Breakfast - Junior','integer',0,2),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='BREAKFAST_LAB'),'astra_bf_lab','Breakfast - Labourer','integer',0,3),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='LUNCH_SNR'),'astra_ln_snr','Lunch - Senior','integer',0,4),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='LUNCH_JNR'),'astra_ln_jnr','Lunch - Junior','integer',0,5),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='LUNCH_LAB'),'astra_ln_lab','Lunch - Labourer','integer',0,6),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='DINNER_SNR'),'astra_dn_snr','Dinner - Senior','integer',0,7),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='DINNER_JNR'),'astra_dn_jnr','Dinner - Junior','integer',0,8),
 (@AMR_FORM,@G2,(SELECT id FROM customers WHERE code='ASTRA'),
   (SELECT id FROM contract_categories WHERE code='DINNER_LAB'),'astra_dn_lab','Dinner - Labourer','integer',0,9),

/* Parcel count fields */
 (@AMR_FORM,@G3,(SELECT id FROM customers WHERE code='PARCEL'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_SNR'),'parcel_snr','Senior','integer',0,1),
 (@AMR_FORM,@G3,(SELECT id FROM customers WHERE code='PARCEL'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_JNR'),'parcel_jnr','Junior','integer',0,2),
 (@AMR_FORM,@G3,(SELECT id FROM customers WHERE code='PARCEL'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_LAB'),'parcel_lab','Labourer','integer',0,3),
 
 /* Stock fields */
 (@AMR_FORM,@GSTOCK,NULL,NULL,'opening_stock','Opening Stock','decimal',1,1),
 (@AMR_FORM,@GSTOCK,NULL,NULL,'purchase','Purchase','decimal',1,2),
 (@AMR_FORM,@GSTOCK,NULL,NULL,'purchase_rtn','Purchase Return','decimal',1,3),
 (@AMR_FORM,@GSTOCK,NULL,NULL,'transfer_in','Transfer In','decimal',1,4),
 (@AMR_FORM,@GSTOCK,NULL,NULL,'transfer_out','Transfer Out','decimal',1,5),
 (@AMR_FORM,@GSTOCK,NULL,NULL,'closing_stock','Closing Stock','decimal',1,6)
;

/* contracts & rates – AMR + Al Mariah Ruwaiz */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@AMR,(SELECT id FROM customers WHERE code='ALMRWZ'),'2025-02-01');
SET @AMR_ALMRWZ_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@AMR_ALMRWZ_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_SNR'),26,'per-day'),
 (@AMR_ALMRWZ_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_JNR'),20,'per-day'),
 (@AMR_ALMRWZ_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_LAB'),15,'per-day');

/* contracts & rates – AMR + Astra */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@AMR,(SELECT id FROM customers WHERE code='ASTRA'),'2025-02-01');
SET @AMR_ASTRA_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='BREAKFAST_SNR'),3.6,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='BREAKFAST_JNR'),3,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='BREAKFAST_LAB'),3,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='LUNCH_SNR'),7.2,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='LUNCH_JNR'),6,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='LUNCH_LAB'),6,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='DINNER_SNR'),7.2,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='DINNER_JNR'),6,'per-meal'),
 (@AMR_ASTRA_CON,(SELECT id FROM contract_categories WHERE code='DINNER_LAB'),6,'per-meal');

/* contracts & rates – AMR + PARCEL */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@AMR,(SELECT id FROM customers WHERE code='PARCEL'),'2025-02-01');
SET @AMR_PARCEL_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@AMR_PARCEL_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_SNR'),1.5,'per-day'),
 (@AMR_PARCEL_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_JNR'),1,'per-day'),
 (@AMR_PARCEL_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_LAB'),1,'per-day');






 /* Al Nazr (branch code = ALNAZR) */
SET @ALNAZR := (SELECT id FROM branches WHERE code='ALNAZR');
SET @ALNAZR_FORM := (SELECT id FROM forms WHERE branch_id=@ALNAZR AND valid_from='2025-02-01');

/* groups */
INSERT INTO form_groups(form_id,sort_order,label) VALUES
 (@ALNAZR_FORM,1,'Al Nazr'),
 (@ALNAZR_FORM,2,'Western Catering'),
 (@ALNAZR_FORM,3,'Parcel Count'),
 (@ALNAZR_FORM,99,'Stock');

/* capture group ids */
SET @G1 := (SELECT id FROM form_groups WHERE form_id=@ALNAZR_FORM AND label='Al Nazr');
SET @G2 := (SELECT id FROM form_groups WHERE form_id=@ALNAZR_FORM AND label='Western Catering');
SET @G3 := (SELECT id FROM form_groups WHERE form_id=@ALNAZR_FORM AND label='Parcel Count');
SET @GSTOCK := (SELECT id FROM form_groups WHERE form_id=@ALNAZR_FORM AND label='Stock');

/* fields */
INSERT INTO form_fields(form_id,group_id,customer_id,category_id,key_code,label,data_type,required,sort_order) VALUES
 (@ALNAZR_FORM,NULL,NULL,NULL,'date','Date','date',1,1),
 (@ALNAZR_FORM,NULL,NULL,NULL,'consumption','Consumption','decimal',1,2),
 
 /* Al Nazr fields */
 (@ALNAZR_FORM,@G1,(SELECT id FROM customers WHERE code='ALNAZR'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_SNR'),'alnazr_snr','Senior','integer',0,1),
 (@ALNAZR_FORM,@G1,(SELECT id FROM customers WHERE code='ALNAZR'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_JNR'),'alnazr_jnr','Junior','integer',0,2),
 (@ALNAZR_FORM,@G1,(SELECT id FROM customers WHERE code='ALNAZR'),
   (SELECT id FROM contract_categories WHERE code='MEALDAY_LAB'),'alnazr_lab','Labourer','integer',0,3),
 
 /* Western Catering fields */
 (@ALNAZR_FORM,@G2,(SELECT id FROM customers WHERE code='WESTCAT'),
   (SELECT id FROM contract_categories WHERE code='BREAKFAST'),'westcat_bf','Breakfast','integer',0,1),
 (@ALNAZR_FORM,@G2,(SELECT id FROM customers WHERE code='WESTCAT'),
   (SELECT id FROM contract_categories WHERE code='LUNCH'),'westcat_ln','Lunch','integer',0,2),
 (@ALNAZR_FORM,@G2,(SELECT id FROM customers WHERE code='WESTCAT'),
   (SELECT id FROM contract_categories WHERE code='DINNER'),'westcat_dn','Dinner','integer',0,3),
 
 /* Parcel count fields */
 (@ALNAZR_FORM,@G3,(SELECT id FROM customers WHERE code='PARCEL'),
   (SELECT id FROM contract_categories WHERE code='BREAKFAST'),'parcel_bf','Breakfast','integer',0,1),
 (@ALNAZR_FORM,@G3,(SELECT id FROM customers WHERE code='PARCEL'),
   (SELECT id FROM contract_categories WHERE code='LUNCH'),'parcel_ln','Lunch','integer',0,2),
 (@ALNAZR_FORM,@G3,(SELECT id FROM customers WHERE code='PARCEL'),
   (SELECT id FROM contract_categories WHERE code='DINNER'),'parcel_dn','Dinner','integer',0,3),
 
 /* Stock fields */
 (@ALNAZR_FORM,@GSTOCK,NULL,NULL,'opening_stock','Opening Stock','decimal',1,1),
 (@ALNAZR_FORM,@GSTOCK,NULL,NULL,'purchase','Purchase','decimal',1,2),
 (@ALNAZR_FORM,@GSTOCK,NULL,NULL,'purchase_rtn','Purchase Return','decimal',1,3),
 (@ALNAZR_FORM,@GSTOCK,NULL,NULL,'transfer_in','Transfer In','decimal',1,4),
 (@ALNAZR_FORM,@GSTOCK,NULL,NULL,'transfer_out','Transfer Out','decimal',1,5),
 (@ALNAZR_FORM,@GSTOCK,NULL,NULL,'closing_stock','Closing Stock','decimal',1,6)
;

/* contracts & rates – ALNAZR + Al Nazr */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@ALNAZR,(SELECT id FROM customers WHERE code='ALNAZR'),'2025-02-01');
SET @ALNAZR_ALNAZR_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@ALNAZR_ALNAZR_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_SNR'),20,'per-day'),
 (@ALNAZR_ALNAZR_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_JNR'),17,'per-day'),
 (@ALNAZR_ALNAZR_CON,(SELECT id FROM contract_categories WHERE code='MEALDAY_LAB'),14,'per-day');

/* contracts & rates – ALNAZR + Western Catering */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@ALNAZR,(SELECT id FROM customers WHERE code='WESTCAT'),'2025-02-01');
SET @ALNAZR_WESTCAT_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@ALNAZR_WESTCAT_CON,(SELECT id FROM contract_categories WHERE code='BREAKFAST'),3,'per-meal'),
 (@ALNAZR_WESTCAT_CON,(SELECT id FROM contract_categories WHERE code='LUNCH'),6,'per-meal'),
 (@ALNAZR_WESTCAT_CON,(SELECT id FROM contract_categories WHERE code='DINNER'),6,'per-meal');

/* contracts & rates – ALNAZR + Parcel Count */
INSERT INTO contracts(branch_id,customer_id,valid_from)
VALUES (@ALNAZR,(SELECT id FROM customers WHERE code='PARCEL'),'2025-02-01');
SET @ALNAZR_PARCEL_CON := LAST_INSERT_ID();
INSERT INTO contract_rates(contract_id,category_id,rate,uom) VALUES
 (@ALNAZR_PARCEL_CON,(SELECT id FROM contract_categories WHERE code='BREAKFAST'),2,'per-meal'),
 (@ALNAZR_PARCEL_CON,(SELECT id FROM contract_categories WHERE code='LUNCH'),2,'per-meal'),
 (@ALNAZR_PARCEL_CON,(SELECT id FROM contract_categories WHERE code='DINNER'),2,'per-meal');




 /* Afwaj/ALEC RAK (branch code = RAK) */
SET @RAK := (SELECT id FROM branches WHERE code='RAK');
SET @RAK_FORM := (SELECT id FROM forms WHERE branch_id=@RAK AND valid_from='2025-02-01');

/* groups */
INSERT INTO form_groups(form_id,sort_order,label) VALUES
 (@RAK_FORM,1,'Canteen'),
 (@RAK_FORM,2,'Mess'),
 (@RAK_FORM,3,'Aggregator'),
 (@RAK_FORM,99,'Stock');

/* capture group ids */
SET @G1 := (SELECT id FROM form_groups WHERE form_id=@RAK_FORM AND label='Canteen');
SET @G2 := (SELECT id FROM form_groups WHERE form_id=@RAK_FORM AND label='Mess');
SET @G3 := (SELECT id FROM form_groups WHERE form_id=@RAK_FORM AND label='Aggregator');
SET @GSTOCK := (SELECT id FROM form_groups WHERE form_id=@RAK_FORM AND label='Stock');

/* fields */
INSERT INTO form_fields(form_id,group_id,customer_id,category_id,key_code,label,data_type,required,sort_order) VALUES
 (@RAK_FORM,NULL,NULL,NULL,'date','Date','date',1,1),
 
 /* Consumption fields */
 (@RAK_FORM,NULL,NULL,NULL,'kitchen_consumption','Kitchen Consumption','decimal',1,2),
 (@RAK_FORM,NULL,NULL,NULL,'transfer_to_canteen','Transfer to Canteen','decimal',1,3),
 (@RAK_FORM,NULL,NULL,NULL,'cash_purchase_canteen','Cash Purchase at Canteen','decimal',1,4),
 
 /* Revenue fields */
 (@RAK_FORM,@G1,(SELECT id FROM customers WHERE code='CANTEEN'),NULL,'canteen_sale','Canteen Sale','decimal',1,1),
 (@RAK_FORM,@G2,(SELECT id FROM customers WHERE code='MESS'),NULL,'mess_sale','Mess Sale','decimal',1,1),
 (@RAK_FORM,@G3,(SELECT id FROM customers WHERE code='AGGR'),NULL,'aggregator_sale','Aggregator Sale','decimal',1,1),
 
 /* Stock fields */
 (@RAK_FORM,@GSTOCK,NULL,NULL,'opening_stock','Opening Stock','decimal',1,1),
 (@RAK_FORM,@GSTOCK,NULL,NULL,'purchase','Purchase','decimal',1,2),
 (@RAK_FORM,@GSTOCK,NULL,NULL,'purchase_rtn','Purchase Return','decimal',1,3),
 (@RAK_FORM,@GSTOCK,NULL,NULL,'transfer_in','Transfer In','decimal',1,4),
 (@RAK_FORM,@GSTOCK,NULL,NULL,'transfer_out','Transfer Out','decimal',1,5),
 (@RAK_FORM,@GSTOCK,NULL,NULL,'closing_stock','Closing Stock','decimal',1,6)
;

/* contracts & rates – RAK (pseudo customers don't need contract rates) */
/* Note: Since these are pseudo customers (CANTEEN, MESS, AGGR) with is_pseudo=1, */
/* we typically don't need contract rates for them as they represent internal buckets */
/* rather than contractual customers. If you need to add rates for these, please let me know. */