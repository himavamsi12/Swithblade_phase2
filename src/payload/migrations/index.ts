import * as migration_20260928_100727_initial from './20260928_100727_initial';
import * as migration_20260928_101159_remove_user_api_keys from './20260928_101159_remove_user_api_keys';
import * as migration_20260929_112959_remove_customer_payload_auth from './20260929_112959_remove_customer_payload_auth';
import * as migration_20260929_113017_add_customer_supabase_fields from './20260929_113017_add_customer_supabase_fields';
import * as migration_20260929_113100_sync_supabase_customers from './20260929_113100_sync_supabase_customers';
import * as migration_20260930_092401_add_order_line_items from './20260930_092401_add_order_line_items';
import * as migration_20260930_140000_product_search from './20260930_140000_product_search';
import * as migration_20261015_053138_add_order_razorpay_ids from './20261015_053138_add_order_razorpay_ids';
import * as migration_20261015_054333_default_currency_inr from './20261015_054333_default_currency_inr';
import * as migration_20261027_064946_kill_switches from './20261027_064946_kill_switches';
import * as migration_20261027_065649_phone_customers from './20261027_065649_phone_customers';
import * as migration_20261028_052856_media_storage_prefix from './20261028_052856_media_storage_prefix';
import * as migration_20261028_071842_storefront_catalog_fields from './20261028_071842_storefront_catalog_fields';
import * as migration_20261028_101419_currencies_inr_first from './20261028_101419_currencies_inr_first';
import * as migration_20261028_111507_customer_saved_bag from './20261028_111507_customer_saved_bag';
import * as migration_20261028_112647_stock_holds from './20261028_112647_stock_holds';
import * as migration_20261029_060415_disable_draft_autosave from './20261029_060415_disable_draft_autosave';
import * as migration_20261030_063235_product_color_images from './20261030_063235_product_color_images';
import * as migration_20261030_064542_yes_no_product_flags from './20261030_064542_yes_no_product_flags';

export const migrations = [
  {
    up: migration_20260928_100727_initial.up,
    down: migration_20260928_100727_initial.down,
    name: '20260928_100727_initial',
  },
  {
    up: migration_20260928_101159_remove_user_api_keys.up,
    down: migration_20260928_101159_remove_user_api_keys.down,
    name: '20260928_101159_remove_user_api_keys',
  },
  {
    up: migration_20260929_112959_remove_customer_payload_auth.up,
    down: migration_20260929_112959_remove_customer_payload_auth.down,
    name: '20260929_112959_remove_customer_payload_auth',
  },
  {
    up: migration_20260929_113017_add_customer_supabase_fields.up,
    down: migration_20260929_113017_add_customer_supabase_fields.down,
    name: '20260929_113017_add_customer_supabase_fields',
  },
  {
    up: migration_20260929_113100_sync_supabase_customers.up,
    down: migration_20260929_113100_sync_supabase_customers.down,
    name: '20260929_113100_sync_supabase_customers',
  },
  {
    up: migration_20260930_092401_add_order_line_items.up,
    down: migration_20260930_092401_add_order_line_items.down,
    name: '20260930_092401_add_order_line_items',
  },
  {
    up: migration_20260930_140000_product_search.up,
    down: migration_20260930_140000_product_search.down,
    name: '20260930_140000_product_search',
  },
  {
    up: migration_20261015_053138_add_order_razorpay_ids.up,
    down: migration_20261015_053138_add_order_razorpay_ids.down,
    name: '20261015_053138_add_order_razorpay_ids',
  },
  {
    up: migration_20261015_054333_default_currency_inr.up,
    down: migration_20261015_054333_default_currency_inr.down,
    name: '20261015_054333_default_currency_inr',
  },
  {
    up: migration_20261027_064946_kill_switches.up,
    down: migration_20261027_064946_kill_switches.down,
    name: '20261027_064946_kill_switches',
  },
  {
    up: migration_20261027_065649_phone_customers.up,
    down: migration_20261027_065649_phone_customers.down,
    name: '20261027_065649_phone_customers',
  },
  {
    up: migration_20261028_052856_media_storage_prefix.up,
    down: migration_20261028_052856_media_storage_prefix.down,
    name: '20261028_052856_media_storage_prefix',
  },
  {
    up: migration_20261028_071842_storefront_catalog_fields.up,
    down: migration_20261028_071842_storefront_catalog_fields.down,
    name: '20261028_071842_storefront_catalog_fields',
  },
  {
    up: migration_20261028_101419_currencies_inr_first.up,
    down: migration_20261028_101419_currencies_inr_first.down,
    name: '20261028_101419_currencies_inr_first',
  },
  {
    up: migration_20261028_111507_customer_saved_bag.up,
    down: migration_20261028_111507_customer_saved_bag.down,
    name: '20261028_111507_customer_saved_bag',
  },
  {
    up: migration_20261028_112647_stock_holds.up,
    down: migration_20261028_112647_stock_holds.down,
    name: '20261028_112647_stock_holds',
  },
  {
    up: migration_20261029_060415_disable_draft_autosave.up,
    down: migration_20261029_060415_disable_draft_autosave.down,
    name: '20261029_060415_disable_draft_autosave',
  },
  {
    up: migration_20261030_063235_product_color_images.up,
    down: migration_20261030_063235_product_color_images.down,
    name: '20261030_063235_product_color_images',
  },
  {
    up: migration_20261030_064542_yes_no_product_flags.up,
    down: migration_20261030_064542_yes_no_product_flags.down,
    name: '20261030_064542_yes_no_product_flags'
  },
];
