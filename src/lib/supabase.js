import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Variáveis de ambiente do Supabase não configuradas. ' +
        'Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
    )
}

// Verifica se as chaves básicas estão presentes e são válidas
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
)
