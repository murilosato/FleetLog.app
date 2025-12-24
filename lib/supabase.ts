
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybclluccxjblhougqdep.supabase.co';
const supabaseKey = 'sb_publishable_cdXviSgBidwudAGZq-o93Q_TXehVq4k_';

export const supabase = createClient(supabaseUrl, supabaseKey);
