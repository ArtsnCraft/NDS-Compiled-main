const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { galleryItemId } = JSON.parse(event.body || '{}');
  
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

  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          email
        )
      `)
      .eq('gallery_item_id', galleryItemId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ comments: data })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 