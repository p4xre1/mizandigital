/* Table schema:
CREATE TABLE kv_store_a14cca9e (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
*/

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// التحقق الآمن من وجود متغيرات البيئة قبل بناء العميل
const client = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase Environment Variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Check your .env file!");
  }

  return createClient(url, serviceRole);
};

const TABLE_NAME = "kv_store_a14cca9e";

// Set stores a key-value pair in the database.
export const set = async (key: string, value: unknown): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE_NAME).upsert({
    key,
    value
  });
  if (error) {
    throw new Error(error.message);
  }
};

// Get retrieves a key-value pair from the database.
export const get = async (key: string): Promise<unknown> => {
  const supabase = client();
  const { data, error } = await supabase.from(TABLE_NAME).select("value").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.value;
};

// Delete deletes a key-value pair from the database.
export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE_NAME).delete().eq("key", key);
  if (error) {
    throw new Error(error.message);
  }
};

// Sets multiple key-value pairs in the database.
export const mset = async (keys: string[], values: unknown[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE_NAME).upsert(
    keys.map((k, i) => ({ key: k, value: values[i] }))
  );
  if (error) {
    throw new Error(error.message);
  }
};

// Gets multiple key-value pairs from the database.
export const mget = async (keys: string[]): Promise<unknown[]> => {
  const supabase = client();
  const { data, error } = await supabase.from(TABLE_NAME).select("value").in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};

// Deletes multiple key-value pairs from the database.
export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(TABLE_NAME).delete().in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
};

// Search for key-value pairs by prefix.
export const getByPrefix = async (prefix: string): Promise<unknown[]> => {
  const supabase = client();
  const { data, error } = await supabase.from(TABLE_NAME).select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};