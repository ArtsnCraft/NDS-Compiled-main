const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { galleryItemId, content } = JSON.parse(event.body || '{}');
  
  if (!galleryItemId || !content) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Gallery item ID and content are required' })
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Get user from Authorization header
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authorization header required' })
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Add comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        gallery_item_id: galleryItemId,
        user_id: user.id,
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ comment: data })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 