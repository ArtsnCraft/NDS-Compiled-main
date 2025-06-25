const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  console.log('toggle-like event.body:', event.body); // Log incoming body for debugging
  let galleryItemId;
  try {
    const body = JSON.parse(event.body || '{}');
    galleryItemId = body.galleryItemId;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }
  
  if (!galleryItemId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Gallery item ID is required' })
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

    // Check if user already liked this item
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('gallery_item_id', galleryItemId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ liked: false, action: 'unliked' })
      };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          gallery_item_id: galleryItemId,
          user_id: user.id
        });

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ liked: true, action: 'liked' })
      };
    }
  } catch (error) {
    console.error('toggle-like error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 