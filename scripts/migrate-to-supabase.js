import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateData() {
  try {
    console.log('🚀 Starting migration to Supabase...')

    // Read existing gallery data
    const galleryDataPath = path.join(process.cwd(), 'galleryData.json')
    const galleryData = JSON.parse(fs.readFileSync(galleryDataPath, 'utf8'))

    console.log(`📊 Found ${galleryData.length} media items to migrate`)

    // Create categories first
    const categories = [
      { name: 'Landscape', color: '#3B82F6' },
      { name: 'Night', color: '#1F2937' },
      { name: 'Video', color: '#EF4444' },
      { name: 'Uncategorized', color: '#6B7280' }
    ]

    console.log('📂 Creating categories...')
    for (const category of categories) {
      try {
        await supabase
          .from('categories')
          .insert([category])
        console.log(`✅ Created category: ${category.name}`)
      } catch (error) {
        if (error.code !== '23505') { // Ignore unique constraint violations
          console.error(`❌ Failed to create category ${category.name}:`, error.message)
        }
      }
    }

    // Migrate media items
    console.log('📸 Migrating media items...')
    let successCount = 0
    let errorCount = 0

    for (const item of galleryData) {
      try {
        // Check if file exists in created folder
        const filePath = path.join(process.cwd(), 'created', item.filename)
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ File not found: ${item.filename}`)
          continue
        }

        // Get file stats
        const stats = fs.statSync(filePath)
        const fileSize = stats.size

        // Determine file type
        const fileExtension = path.extname(item.filename).toLowerCase()
        const isVideo = ['.mp4', '.webm', '.mov'].includes(fileExtension)

        // Create media item record
        const mediaItem = {
          filename: item.filename,
          title: item.title,
          description: item.description,
          category: item.category || 'Uncategorized',
          type: isVideo ? 'video' : 'image',
          url: `https://your-domain.com/created/${item.filename}`, // Update with your actual domain
          file_size: fileSize,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        await supabase
          .from('media_items')
          .insert([mediaItem])

        successCount++
        console.log(`✅ Migrated: ${item.filename}`)
      } catch (error) {
        errorCount++
        console.error(`❌ Failed to migrate ${item.filename}:`, error.message)
      }
    }

    console.log('\n🎉 Migration completed!')
    console.log(`✅ Successfully migrated: ${successCount} items`)
    console.log(`❌ Failed to migrate: ${errorCount} items`)

    if (errorCount > 0) {
      console.log('\n⚠️ Some items failed to migrate. Check the errors above.')
    }

  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateData() 