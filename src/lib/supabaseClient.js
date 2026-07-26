import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Якщо бачиш цю помилку в консолі — перевір файл .env (див. README, крок 3)
  console.error(
    'Supabase env variables are missing. Перевір .env файл: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
