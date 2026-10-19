import * as migration_20260928_100727_initial from './20260928_100727_initial';
import * as migration_20260928_101159_remove_user_api_keys from './20260928_101159_remove_user_api_keys';
import * as migration_20260929_112959_remove_customer_payload_auth from './20260929_112959_remove_customer_payload_auth';
import * as migration_20260929_113017_add_customer_supabase_fields from './20260929_113017_add_customer_supabase_fields';
import * as migration_20260929_113100_sync_supabase_customers from './20260929_113100_sync_supabase_customers';
import * as migration_20260930_092401_add_order_line_items from './20260930_092401_add_order_line_items';
import * as migration_20260930_140000_product_search from './20260930_140000_product_search';
import * as migration_20261015_053138_add_order_razorpay_ids from './20261015_053138_add_order_razorpay_ids';
import * as migration_20261015_054333_default_currency_inr from './20261015_054333_default_currency_inr';

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
    name: '20261015_054333_default_currency_inr'
  },
];
