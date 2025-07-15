const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get JWT from Authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const jwt = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Create Supabase client with JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  });

  const body = JSON.parse(event.body);

  // Coerce shared_with to null unless restricted and non-empty array
  if (body.visibility !== 'restricted' || !Array.isArray(body.shared_with) || body.shared_with.length === 0) {
    body.shared_with = null;
  }

  const { data, error } = await supabase
    .from('gallery_items')
    .insert([body]);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
  return { statusCode: 200, body: JSON.stringify(data) };
}; 