import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://enwlwudxtxpebxqfzkku.supabase.co'
const SUPABASE_KEY = 'sb_publishable_cZys0aMM3A6o7VSUCgU-tw_yduC-9I5'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function sbGet(key) {
  const { data } = await supabase
    .from('re_data')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value ?? null
}

export async function sbSet(key, value) {
  await supabase
    .from('re_data')
    .upsert({ key, value, updated_at: new Date().toISOString() })
}
