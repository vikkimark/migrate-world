import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or key in env');
  process.exit(1);
}
const supabase = createClient(url, key);
const seed = [
  { name: 'University of Toronto', country: 'Canada', city: 'Toronto', website: 'https://www.utoronto.ca' },
  { name: 'McGill University', country: 'Canada', city: 'Montreal', website: 'https://www.mcgill.ca' },
  { name: 'University of British Columbia', country: 'Canada', city: 'Vancouver', website: 'https://www.ubc.ca' },
];
for (const row of seed) {
  const { error } = await supabase.from('universities').insert(row);
  if (error) { console.error(error); process.exit(1); }
}
console.log('Seeded universities ✅');
