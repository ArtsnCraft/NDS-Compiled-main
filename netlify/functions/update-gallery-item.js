const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async function(event) {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get JWT from Authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const jwt = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authorization header required' }) };
  }

  // Create Supabase client with JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  });

  let updates;
  try {
    updates = JSON.parse(event.body);
    if (!Array.isArray(updates)) updates = [updates];
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Get user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  let results = [];
  for (const update of updates) {
    const { id, ...fields } = update;
    if (!id) {
      results.push({ id: null, error: 'Missing id' });
      continue;
    }
    // Only allow updating own items
    const { data: item, error: fetchError } = await supabase
      .from('gallery_items')
      .select('user_id')
      .eq('id', id)
      .single();
    if (fetchError || !item) {
      results.push({ id, error: 'Item not found or fetch error' });
      continue;
    }
    if (item.user_id !== user.id) {
      results.push({ id, error: 'Unauthorized' });
      continue;
    }
    // Coerce shared_with to null unless restricted and non-empty array
    if (fields.visibility !== 'restricted' || !Array.isArray(fields.shared_with) || fields.shared_with.length === 0) {
      fields.shared_with = null;
    }
    // Update the item
    const { error: updateError } = await supabase
      .from('gallery_items')
      .update(fields)
      .eq('id', id);
    if (updateError) {
      results.push({ id, error: updateError.message });
    } else {
      results.push({ id, success: true });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
}; 