const { createClient } = require('@supabase/supabase-js');

// Environment variables (set these in Netlify dashboard or a .env file)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Parse user_id, page, and pageSize from query string
  const params = new URLSearchParams(event.queryStringParameters ? event.queryStringParameters : {});
  const userId = params.get('user_id') || (event.queryStringParameters && event.queryStringParameters.user_id);
  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || '20', 10);

  // Get current user from Authorization header (JWT)
  let currentUserId = null;
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.replace('Bearer ', '');
    // Use Supabase to get user from JWT
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
      if (!userError && user) {
        currentUserId = user.id;
      }
    } catch (e) {
      // Ignore, treat as not logged in
    }
  }

  let query = supabase
    .from('gallery_items')
    .select(`
      *,
      likes:likes(count),
      comments:comments(count)
    `)
    .order('created_at', { ascending: false });
    
  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Pagination: calculate range
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }

  const sharedWithMe = params.get('shared_with_me') === 'true' || (event.queryStringParameters && event.queryStringParameters.shared_with_me === 'true');

  // Privacy filtering
  let filteredData;
  if (sharedWithMe && currentUserId) {
    filteredData = (data || []).filter(item => {
      return item.visibility === 'restricted' && Array.isArray(item.shared_with) && item.shared_with.includes(currentUserId);
    });
  } else {
    filteredData = (data || []).filter(item => {
      if (item.visibility === 'public' || !item.visibility) return true;
      if (!currentUserId) return false; // Not logged in, only public
      if (item.visibility === 'private') return item.user_id === currentUserId;
      if (item.visibility === 'restricted') {
        if (item.user_id === currentUserId) return true;
        if (Array.isArray(item.shared_with) && item.shared_with.includes(currentUserId)) return true;
        return false;
      }
      return false;
    });
  }

  // Transform the data to flatten the counts
  const transformedData = filteredData.map(item => ({
    ...item,
    like_count: item.likes?.[0]?.count || 0,
    comment_count: item.comments?.[0]?.count || 0,
    likes: undefined, // Remove the nested likes object
    comments: undefined // Remove the nested comments object
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(transformedData)
  };
}; 