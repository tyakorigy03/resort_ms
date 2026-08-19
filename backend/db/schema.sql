CREATE DATABASE IF NOT EXISTS resort_ms;
USE resort_ms;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NULL UNIQUE,
  category VARCHAR(100) NULL,
  measured_by ENUM('Units', 'Volume', 'Weight', 'Length') NOT NULL DEFAULT 'Units',
  unit VARCHAR(50) NOT NULL DEFAULT 'Piece',
  accounting_group VARCHAR(100) NULL,
  description TEXT NULL,
  image LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(150) NULL,
  email VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS item_suppliers (
  item_id INT UNSIGNED NOT NULL,
  supplier_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (item_id, supplier_id),
  CONSTRAINT fk_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- Price history per item (cost + selling). Current price = the row with the
-- latest effective_from <= today. History keeps valuations correct after a
-- price change and feeds future ERP (PO cost, sales sell price).
CREATE TABLE IF NOT EXISTS item_prices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_price_item_effective (item_id, effective_from),
  CONSTRAINT fk_price_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Physical storage areas. Every stock movement belongs to a location, so
-- stock levels are per (item, location) and counts are done per location.
CREATE TABLE IF NOT EXISTS locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_location_name (name)
);

-- A stock count is a BATCH (cycle count) covering multiple items on one
-- occasion in ONE location. The header holds date/staff/location; each line
-- snapshots cost_price at count time so value columns stay accurate after
-- prices change. Value is always derived per line:
-- system_value = system_qty * cost_price, counted_value = counted_qty *
-- cost_price, variance = counted - system.
CREATE TABLE IF NOT EXISTS stock_counts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  count_date DATE NOT NULL,
  staff VARCHAR(100) NOT NULL,
  location_id INT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_count_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  stock_count_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  system_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  counted_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_sci_count (stock_count_id),
  KEY idx_sci_item (item_id),
  CONSTRAINT fk_sci_count FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id) ON DELETE CASCADE,
  CONSTRAINT fk_sci_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- A wastage entry is a BATCH of items written off on one occasion (like a
-- stock count). The header holds date/staff/location; each line snapshots
-- unit_cost at recording time and writes an OUT movement of type='wastage'
-- into the shared ledger, so stock levels drop automatically.
CREATE TABLE IF NOT EXISTS wastage_batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  date DATE NOT NULL,
  staff VARCHAR(100) NOT NULL,
  location_id INT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_wb_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wastage_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  wastage_batch_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_wi_batch (wastage_batch_id),
  KEY idx_wi_item (item_id),
  CONSTRAINT fk_wi_batch FOREIGN KEY (wastage_batch_id) REFERENCES wastage_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_wi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Stock quantity ledger (ERP system-of-record for "system stock").
-- IN/OUT movements with unit cost + reference become the source that stock
-- counts compare against. `type` classifies the movement (opening, purchase,
-- sale, count adjustment, wastage, return, transfer) so reports can slice
-- it; `location_id` makes stock levels per storage area; `reason` carries
-- wastage/return detail; `staff` records who moved the stock.
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  direction ENUM('IN', 'OUT') NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) NULL,
  type ENUM('opening', 'purchase', 'sale', 'count', 'wastage', 'return', 'transfer', 'production') NOT NULL DEFAULT 'opening',
  reason VARCHAR(100) NULL,
  staff VARCHAR(100) NULL,
  location_id INT UNSIGNED NULL,
  reference VARCHAR(100) NULL,
  moved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_move_item_date (item_id, moved_at),
  KEY idx_move_location (location_id, item_id, moved_at),
  CONSTRAINT fk_move_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_move_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- A purchase order follows a workflow: created as a DRAFT, then SENT to the
-- supplier (optionally emailed, recipient pre-filled from supplier.email), then
-- RECEIVED (goods receipt records actual received quantities). Only receiving
-- writes IN movements of type='purchase' in the shared ledger and rolls the
-- received unit_cost forward into item_prices (effective from the purchase
-- date), so stock is valued at the latest purchase cost.
CREATE TABLE IF NOT EXISTS purchases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_date DATE NOT NULL,
  po_number VARCHAR(100) NULL,
  supplier_id INT UNSIGNED NULL,
  staff VARCHAR(100) NOT NULL,
  location_id INT UNSIGNED NULL,
  notes TEXT NULL,
  status ENUM('draft', 'sent', 'received') NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP NULL,
  sent_to_email VARCHAR(150) NULL,
  received_at TIMESTAMP NULL,
  receive_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  received_qty DECIMAL(12,3) NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_pi_purchase (purchase_id),
  KEY idx_pi_item (item_id),
  CONSTRAINT fk_pi_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Files attached at goods receipt (e.g. supplier invoice, delivery note).
-- The file bytes live under backend/uploads/receipts/; this table maps them to
-- the purchase and keeps the original name for download.
CREATE TABLE IF NOT EXISTS purchase_attachments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id INT UNSIGNED NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size INT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pa_purchase (purchase_id),
  CONSTRAINT fk_pa_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

-- A recipe defines how to make one output item from ingredient items. It is a
-- template only: running a batch scales every ingredient line and the output
-- quantity by the same factor. Costing happens at batch time, so recipes
-- never snapshot prices.
--
-- type='made_in_batches' recipes make a fixed batch size (output_qty) and are
-- scaled by a batch multiplier. type='made_to_order' recipes have no output
-- quantity (output_qty is NULL); their ingredient quantities are per ONE unit
-- and the batch itself decides how many units to produce.
-- A recipe belongs to exactly ONE item (output_item_id is unique): you pick an
-- existing item and that item is what the recipe produces. name mirrors the
-- item name for readability of batch history. output_unit lets the recipe
-- express its batch size in a different unit than the item's own (override);
-- NULL means the item's unit is used.
CREATE TABLE IF NOT EXISTS recipes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  output_item_id INT UNSIGNED NOT NULL,
  output_qty DECIMAL(12,3) NULL,
  output_unit VARCHAR(50) NULL,
  type ENUM('made_to_order', 'made_in_batches') NOT NULL DEFAULT 'made_in_batches',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_recipe_output (output_item_id),
  CONSTRAINT fk_recipe_output FOREIGN KEY (output_item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- qty is per one batch (made_in_batches) or per one unit (made_to_order).
-- unit is an optional override for how the quantity is expressed; NULL means
-- the item's own unit is used.
CREATE TABLE IF NOT EXISTS recipe_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipe_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  unit VARCHAR(50) NULL,
  PRIMARY KEY (id),
  KEY idx_ri_recipe (recipe_id),
  KEY idx_ri_item (item_id),
  CONSTRAINT fk_ri_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- A production batch is one run of a recipe on one occasion in one location.
-- The header snapshots the recipe used, the status (in_progress/finished) and
-- the actual output produced (output_qty + output_unit, which the run can
-- override from the recipe defaults). The lines table stores both the consumed
-- ingredients (is_output=0) and the produced output (is_output=1) with their
-- unit costs at batch time. Running a batch writes OUT movements for
-- ingredients and an IN movement for the output, all type='production', so the
-- ledger and stock levels update like purchases/wastage.
CREATE TABLE IF NOT EXISTS production_batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipe_id INT UNSIGNED NOT NULL,
  batch_ref VARCHAR(50) NULL,
  batch_date DATE NOT NULL,
  staff VARCHAR(100) NOT NULL,
  location_id INT UNSIGNED NULL,
  notes TEXT NULL,
  status ENUM('in_progress', 'finished') NOT NULL DEFAULT 'in_progress',
  output_qty DECIMAL(12,3) NULL,
  output_unit VARCHAR(50) NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pb_recipe (recipe_id),
  KEY idx_pb_location (location_id),
  CONSTRAINT fk_pb_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id),
  CONSTRAINT fk_pb_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS production_batch_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_output TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_pbi_batch (batch_id),
  KEY idx_pbi_item (item_id),
  CONSTRAINT fk_pbi_batch FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_pbi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Tax configuration applied to prices. tax_type: inclusive = tax baked into
-- price, exclusive = added on top at the register.
CREATE TABLE IF NOT EXISTS tax_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_type ENUM('inclusive','exclusive') NOT NULL DEFAULT 'inclusive',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Accounting groups classify items for reporting (Food, Beverage, Cleaning,
-- ...). items.accounting_group stores the group NAME, matching this table, so
-- an item keeps its label even if the group is later renamed/deleted. Each
-- group carries the tax profile applied to it and the production centers an
-- item in this group is sent to for production/inventory deduction.
CREATE TABLE IF NOT EXISTS accounting_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  tax_profile_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_acct_name (name),
  KEY idx_ag_tax_profile (tax_profile_id),
  CONSTRAINT fk_ag_tax_profile FOREIGN KEY (tax_profile_id) REFERENCES tax_profiles(id) ON DELETE SET NULL
);

-- Where items get produced (Kitchen, Bar, Bakery...). Accounting groups link to
-- one or more of these so a sold item knows which center to send for production
-- and which stock to deduct from. location_id is the stock area this center
-- consumes from (falls back to the default location when null).
CREATE TABLE IF NOT EXISTS production_centers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NULL,
  description TEXT NULL,
  location_id INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pc_name (name),
  KEY idx_pc_location (location_id),
  CONSTRAINT fk_pc_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Many-to-many: an accounting group may route items to several production
-- centers; a production center may serve several groups.
CREATE TABLE IF NOT EXISTS accounting_group_production_centers (
  accounting_group_id INT UNSIGNED NOT NULL,
  production_center_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (accounting_group_id, production_center_id),
  CONSTRAINT fk_agpc_group FOREIGN KEY (accounting_group_id) REFERENCES accounting_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_agpc_pc FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE CASCADE
);

-- Menu price lists (e.g. Dine-in, Takeaway, Delivery). The default list holds
-- the "main" selling price of every item: the first price added for an item
-- lands in the default list and becomes its main price.
CREATE TABLE IF NOT EXISTS price_lists (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NULL DEFAULT 'USD',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pl_name (name)
);

-- Selling price of an item within a price list. One item can have many prices
-- (one per list); the main price is the row in the default list. Separate from
-- item_prices, which is the COST/selling history used for stock valuation.
CREATE TABLE IF NOT EXISTS menu_prices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  price_list_id INT UNSIGNED NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_mp_item_list (item_id, price_list_id),
  KEY idx_mp_list (price_list_id),
  CONSTRAINT fk_mp_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_list FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE
);

-- A menu groups sellable items into screens (like POS tabs, e.g. Starters,
-- Mains, Drinks). Items are shared: the same item can appear in many screens
-- and many menus, and it keeps its own selling price from the price lists.
-- The nullable config column is reserved for future menu configs (not used
-- yet) so the model can grow without a migration.
CREATE TABLE IF NOT EXISTS menus (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  config JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- A named group of items shown on one screen of a menu.
CREATE TABLE IF NOT EXISTS menu_screens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ms_menu (menu_id),
  CONSTRAINT fk_ms_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- Items placed on a screen of a menu.
CREATE TABLE IF NOT EXISTS menu_screen_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_screen_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_msi_screen_item (menu_screen_id, item_id),
  KEY idx_msi_item (item_id),
  CONSTRAINT fk_msi_screen FOREIGN KEY (menu_screen_id) REFERENCES menu_screens(id) ON DELETE CASCADE,
  CONSTRAINT fk_msi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- A modifier group bundles choices a guest can pick for a menu item (e.g. Size,
-- Extras, Sides). single = pick one, multiple = pick several (min/max selects).
CREATE TABLE IF NOT EXISTS modifier_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  selection_type ENUM('single', 'multiple') NOT NULL DEFAULT 'single',
  min_select INT UNSIGNED NOT NULL DEFAULT 1,
  max_select INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_mg_name (name)
);

-- One choice inside a modifier group. price is the price adjustment applied
-- when the guest picks it (e.g. +1.00 for extra cheese).
CREATE TABLE IF NOT EXISTS modifiers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  modifier_group_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mod_group (modifier_group_id),
  CONSTRAINT fk_mod_group FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

-- A combo is a bundle of existing menu items sold together at one price.
CREATE TABLE IF NOT EXISTS combos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Which items (and how many of each) make up a combo.
CREATE TABLE IF NOT EXISTS combo_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  combo_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ci_combo_item (combo_id, item_id),
  KEY idx_ci_item (item_id),
  CONSTRAINT fk_ci_combo FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- A physical business location (e.g. main restaurant, beach bar). Devices can
-- be assigned to an outlet; future modules (frontdesk, restaurant, KDS) will
-- consume these.
CREATE TABLE IF NOT EXISTS outlets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NULL,
  address TEXT NULL,
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- A device (POS terminal, kitchen display, printer, tablet) that will talk to
-- future modules. outlet_id places the device at a business location;
-- production_center_id assigns a KDS-style device to the kitchen/bar it should
-- show tickets for. config holds free-form JSON (screen layout, printer width...).
CREATE TABLE IF NOT EXISTS devices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  device_type ENUM('pos','kds','printer','tablet','cash_drawer','other') NOT NULL DEFAULT 'pos',
  code VARCHAR(50) NULL,
  pin VARCHAR(255) NULL,
  outlet_id INT UNSIGNED NULL,
  production_center_id INT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  config JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_device_outlet (outlet_id),
  KEY idx_device_pc (production_center_id),
  CONSTRAINT fk_device_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL,
  CONSTRAINT fk_device_pc FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE SET NULL
);

-- A guest/customer shared by the restaurant POS and frontdesk. One record,
-- reusable across both modules.
CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cust_email (email)
);

-- Category of room a hotel sells (Standard, Deluxe, Suite...). base_rate is the
-- walk-in price; rate_plan_prices overrides it per plan.
CREATE TABLE IF NOT EXISTS room_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  max_guests INT UNSIGNED NOT NULL DEFAULT 1,
  base_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rt_name (name)
);

-- A physical room. status = frontdesk/occupancy state; housekeeping_status =
-- cleanliness state managed by the housekeeping module.
CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_number VARCHAR(20) NOT NULL,
  room_type_id INT UNSIGNED NOT NULL,
  floor INT UNSIGNED NULL,
  status ENUM('available','occupied','reserved','ooo') NOT NULL DEFAULT 'available',
  housekeeping_status ENUM('clean','dirty','cleaning','inspected') NOT NULL DEFAULT 'dirty',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_room_number (room_number),
  KEY idx_room_type (room_type_id),
  CONSTRAINT fk_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT
);

-- A pricing scheme (Best Available Rate, Corporate, Walk-in). Each plan carries
-- a rate per room type via rate_plan_prices.
CREATE TABLE IF NOT EXISTS rate_plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rp_name (name)
);

-- Rate of a room type under a rate plan (the M:N bridge).
CREATE TABLE IF NOT EXISTS rate_plan_prices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rate_plan_id INT UNSIGNED NOT NULL,
  room_type_id INT UNSIGNED NOT NULL,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NULL DEFAULT 'USD',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rpp (rate_plan_id, room_type_id),
  KEY idx_rpp_type (room_type_id),
  CONSTRAINT fk_rpp_plan FOREIGN KEY (rate_plan_id) REFERENCES rate_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_rpp_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff_roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_staff_role_name (name)
);

-- Which role can do what. Permission strings are the server-side gate for
-- POS actions (e.g. 'sale_period.open', 'sale_period.close'). New actions
-- add a row here — never a hardcoded check.
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id INT UNSIGNED NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_perm (role_id, permission),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE CASCADE
);

-- Staff members (POS operations: clock-in, sales). A staff row may be linked
-- 1:1 to a users row (staff.user_id) so a person can also log into the
-- backoffice. `position` is the job title shown in the UI; the access level is
-- the linked user's `role` (or PIN/QR for the POS only). role_id picks the
-- staff role that grants POS permissions.
CREATE TABLE IF NOT EXISTS staff (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  position VARCHAR(100) NULL,
  role_id INT UNSIGNED NULL,
  department VARCHAR(100) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  user_id INT UNSIGNED NULL,
  hire_date DATE NULL,
  pin VARCHAR(255) NULL,
  qr_code VARCHAR(64) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_staff_qr (qr_code),
  UNIQUE KEY uk_staff_user (user_id),
  KEY idx_staff_dept (department),
  KEY idx_staff_email (email),
  KEY idx_staff_role (role_id),
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_staff_role FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE SET NULL
);

-- A staff shift: one row per clock-in, closed by a clock-out. Only one row per
-- staff member is open at a time (clocked_out_at IS NULL). opening_cash is the
-- float counted at clock-in; closing_cash is the count at clock-out (NULL until
-- counted), used for till reconciliation.
CREATE TABLE IF NOT EXISTS staff_clock_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id INT UNSIGNED NOT NULL,
  device_id INT UNSIGNED NULL,
  clocked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clocked_out_at DATETIME NULL,
  method ENUM('pin','qr') NULL,
  opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(12,2) NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_clock_staff (staff_id),
  KEY idx_clock_device (device_id),
  CONSTRAINT fk_clock_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_clock_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- A sales (shift) period for an outlet, opened by a manager on one device and
-- shared by all devices in that outlet. "Open" period = closed_at IS NULL;
-- only one open period per outlet is allowed at a time.
CREATE TABLE IF NOT EXISTS sale_periods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  outlet_id INT UNSIGNED NOT NULL,
  opened_by_staff_id INT UNSIGNED NULL,
  opened_on_device_id INT UNSIGNED NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_by_staff_id INT UNSIGNED NULL,
  closed_on_device_id INT UNSIGNED NULL,
  closed_at DATETIME NULL,
  opening_notes TEXT NULL,
  closing_notes TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_sp_outlet (outlet_id),
  KEY idx_sp_opened_by (opened_by_staff_id),
  KEY idx_sp_device (opened_on_device_id),
  CONSTRAINT fk_sp_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_opened_by FOREIGN KEY (opened_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT fk_sp_device FOREIGN KEY (opened_on_device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id INT UNSIGNED NOT NULL,
  task_type ENUM('clean','inspect','maintenance','linen','deep_clean') NOT NULL DEFAULT 'clean',
  status ENUM('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
  staff_id INT UNSIGNED NULL,
  priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  notes TEXT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hk_room (room_id),
  KEY idx_hk_status (status),
  CONSTRAINT fk_hk_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_hk_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);


-- ===========================================================================
-- Restaurant service: floor plans, tables, table sessions, order courses and
-- KDS routing (created by db/_task9_restaurant_service.js on existing DBs).
-- pos_orders / pos_order_items are fully defined here (they were introduced by
-- db/_task5_pos_migration.js and extended by _task9 on existing databases).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS floor_plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  outlet_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  order_profile_id INT UNSIGNED NULL,
  prompt_cover_count TINYINT(1) NOT NULL DEFAULT 1,
  background_image_url VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fp_outlet (outlet_id),
  CONSTRAINT fk_fp_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
);

-- Cash drawer counts: one record per cash drawer device per day. A record for
-- today means the register's opening cash was already confirmed, so the
-- cash-drawer gate (spec 3.2) is not shown again. confirming also writes the
-- opening count back onto the staff member's active clock event when that event
-- has not been counted yet.
CREATE TABLE IF NOT EXISTS cash_drawer_counts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  drawer_device_id INT UNSIGNED NOT NULL,
  outlet_id INT UNSIGNED NOT NULL,
  staff_id INT UNSIGNED NULL,
  count_date DATE NOT NULL,
  opening_count DECIMAL(12,2) NOT NULL DEFAULT 0,
  confirmed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cdc_drawer_day (drawer_device_id, count_date),
  KEY idx_cdc_outlet (outlet_id),
  CONSTRAINT fk_cdc_drawer FOREIGN KEY (drawer_device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdc_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdc_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  floor_plan_id INT UNSIGNED NOT NULL,
  label VARCHAR(20) NOT NULL,
  seats INT UNSIGNED NOT NULL DEFAULT 4,
  pos_x INT NULL,
  pos_y INT NULL,
  shape VARCHAR(20) NOT NULL DEFAULT 'square',
  status ENUM('available','seated','reserved') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rt_floor_plan (floor_plan_id),
  CONSTRAINT fk_rt_floor_plan FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS table_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id INT UNSIGNED NOT NULL,
  outlet_id INT UNSIGNED NOT NULL,
  opened_by_staff_id INT UNSIGNED NULL,
  opened_on_device_id INT UNSIGNED NULL,
  covers INT UNSIGNED NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_ts_table (table_id),
  KEY idx_ts_outlet (outlet_id),
  CONSTRAINT fk_ts_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_staff FOREIGN KEY (opened_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT fk_ts_device FOREIGN KEY (opened_on_device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pos_orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(24) NOT NULL,
  outlet_id INT UNSIGNED NOT NULL,
  device_id INT UNSIGNED NULL,
  staff_id INT UNSIGNED NULL,
  sale_period_id INT UNSIGNED NULL,
  customer_id INT UNSIGNED NULL,
  table_session_id INT UNSIGNED NULL,
  status ENUM('open','paid','void') NOT NULL DEFAULT 'open',
  order_type ENUM('dine_in','pickup','delivery') NOT NULL DEFAULT 'dine_in',
  collection_code VARCHAR(50) NULL,
  covers INT UNSIGNED NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  tip DECIMAL(12,2) NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) NULL,
  payment_received DECIMAL(12,2) NULL,
  change_due DECIMAL(12,2) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_order_number (order_number),
  KEY idx_pos_outlet (outlet_id),
  KEY idx_pos_device (device_id),
  KEY idx_pos_staff (staff_id),
  KEY idx_pos_period (sale_period_id),
  KEY idx_pos_session (table_session_id),
  KEY idx_pos_customer (customer_id),
  CONSTRAINT fk_pos_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_period FOREIGN KEY (sale_period_id) REFERENCES sale_periods(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_courses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  course_number INT UNSIGNED NOT NULL,
  name VARCHAR(100) NULL,
  fired_at DATETIME NULL,
  status ENUM('new','preparing','ready','completed','on_hold','cancelled') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_order_num (order_id, course_number),
  CONSTRAINT fk_course_order FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pos_order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NULL,
  item_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  line_total DECIMAL(12,2) NOT NULL,
  course_id INT UNSIGNED NULL,
  seat_number INT UNSIGNED NULL,
  production_center_id INT UNSIGNED NULL,
  is_station_copy TINYINT(1) NOT NULL DEFAULT 0,
  kds_status ENUM('new','preparing','ready','completed','on_hold','cancelled') NOT NULL DEFAULT 'new',
  fired_at DATETIME NULL,
  preparing_at DATETIME NULL,
  ready_at DATETIME NULL,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_poi_order (order_id),
  KEY idx_poi_item (item_id),
  KEY idx_poi_course (course_id),
  KEY idx_poi_station_status (production_center_id, kds_status),
  CONSTRAINT fk_poi_order FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  CONSTRAINT fk_poi_course FOREIGN KEY (course_id) REFERENCES order_courses(id) ON DELETE SET NULL,
  CONSTRAINT fk_poi_station FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS kds_station_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  production_center_id INT UNSIGNED NOT NULL,
  ticket_view ENUM('full','condensed') NOT NULL DEFAULT 'full',
  color_theme VARCHAR(20) NOT NULL DEFAULT 'light',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone VARCHAR(50) NULL,
  show_station_filter TINYINT(1) NOT NULL DEFAULT 1,
  show_status_filter TINYINT(1) NOT NULL DEFAULT 1,
  show_type_filter TINYINT(1) NOT NULL DEFAULT 1,
  deactivated_statuses JSON NULL,
  wait_time_new INT NULL,
  wait_time_preparing INT NULL,
  wait_time_ready INT NULL,
  layouts_columns INT NOT NULL DEFAULT 3,
  layouts_sidebar TINYINT(1) NOT NULL DEFAULT 0,
  coursing_enabled TINYINT(1) NOT NULL DEFAULT 1,
  routing_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kds_settings_pc (production_center_id),
  CONSTRAINT fk_kds_settings_pc FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE CASCADE
);

-- A reservation is the booking itself, independent of which physical room gets
-- assigned. room_id stays NULL until check-in picks a room from availability.
CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  room_id INT UNSIGNED NULL,
  room_type_id INT UNSIGNED NOT NULL,
  rate_plan_id INT UNSIGNED NULL,
  check_in_date DATETIME NOT NULL,
  check_out_date DATETIME NOT NULL,
  adults INT UNSIGNED NOT NULL DEFAULT 1,
  children INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('booked','checked_in','checked_out','no_show','cancelled') NOT NULL DEFAULT 'booked',
  source VARCHAR(20) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_res_customer (customer_id),
  KEY idx_res_room (room_id),
  KEY idx_res_room_type (room_type_id),
  KEY idx_res_dates (check_in_date, check_out_date),
  KEY idx_res_status (status),
  CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_res_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_rate_plan FOREIGN KEY (rate_plan_id) REFERENCES rate_plans(id) ON DELETE SET NULL
);

-- One folio per stay (guest bill). balance is a maintained running total,
-- recomputed in the same transaction as every line-item write.
CREATE TABLE IF NOT EXISTS folios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id INT UNSIGNED NULL,
  customer_id INT UNSIGNED NOT NULL,
  room_id INT UNSIGNED NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_folio_reservation (reservation_id),
  KEY idx_folio_customer (customer_id),
  KEY idx_folio_room (room_id),
  CONSTRAINT fk_folio_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_folio_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_folio_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Folio ledger: positive amounts are charges, negative are payments. A POS
-- "charge to room" lands here as type=pos_charge with source_order_id pointing
-- back at the restaurant order that generated it.
CREATE TABLE IF NOT EXISTS folio_line_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  folio_id INT UNSIGNED NOT NULL,
  type ENUM('room_charge','pos_charge','payment','adjustment','tax') NOT NULL DEFAULT 'room_charge',
  description VARCHAR(255) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  source_order_id INT UNSIGNED NULL,
  staff_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fli_folio (folio_id),
  KEY idx_fli_order (source_order_id),
  CONSTRAINT fk_fli_folio FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE CASCADE,
  CONSTRAINT fk_fli_order FOREIGN KEY (source_order_id) REFERENCES pos_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_fli_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS room_blocks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_block_room (room_id),
  KEY idx_block_dates (start_date, end_date),
  CONSTRAINT fk_block_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
