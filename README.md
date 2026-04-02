# Gallery CMS - Modern Media Management

A modern, responsive gallery content management system built with React, TypeScript, Tailwind CSS, and Supabase. Features cloud storage, real-time updates, and a beautiful user interface.

## ✨ Features

- **Modern UI/UX**: Glassmorphism design with smooth animations
- **Cloud Storage**: Supabase integration for scalable file storage
- **Real-time Updates**: Live synchronization across devices
- **Advanced Search**: Filter by category, search by title/description
- **Batch Operations**: Select multiple items for bulk actions
- **Lightbox Viewer**: Full-screen media viewing with navigation
- **Drag & Drop Upload**: Intuitive file upload with progress tracking
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **TypeScript**: Full type safety and better development experience
- **Performance Optimized**: Lazy loading, image optimization, and caching

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage)
- **Build Tool**: Vite
- **State Management**: Zustand
- **Icons**: Lucide React
- **Deployment**: Netlify

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd gallery-cms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Supabase Setup

1. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Set up the database schema**
   ```sql
   -- Create media_items table
   CREATE TABLE media_items (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     filename TEXT NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     category TEXT NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('image', 'video')),
     url TEXT NOT NULL,
     thumbnail_url TEXT,
     file_size BIGINT NOT NULL,
     user_id UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create categories table
   CREATE TABLE categories (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT UNIQUE NOT NULL,
     color TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Insert default categories
   INSERT INTO categories (name, color) VALUES
     ('Landscape', '#3B82F6'),
     ('Night', '#1F2937'),
     ('Video', '#EF4444'),
     ('Uncategorized', '#6B7280');

   -- Enable Row Level Security
   ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

   -- Create policies (adjust based on your auth requirements)
   CREATE POLICY "Allow public read access" ON media_items FOR SELECT USING (true);
   CREATE POLICY "Allow public read access" ON categories FOR SELECT USING (true);
   ```

3. **Set up Storage buckets**
   - Go to Storage in your Supabase dashboard
   - Create a new bucket called `media`
   - Set it to public
   - Configure CORS if needed

## 🚀 Deployment

### Netlify Deployment

1. **Connect to GitHub**
   - Push your code to GitHub
   - Connect your repository to Netlify

2. **Configure build settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

3. **Set environment variables**
   - Add your Supabase environment variables in Netlify dashboard
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Deploy**
   - Netlify will automatically deploy on every push to main branch

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy to Netlify
npm run deploy
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Main header with search
│   ├── Gallery.tsx     # Gallery grid component
│   ├── GalleryItem.tsx # Individual media item
│   ├── UploadModal.tsx # File upload modal
│   └── Lightbox.tsx    # Full-screen viewer
├── lib/
│   └── supabase.ts     # Supabase client & types
├── stores/
│   └── galleryStore.ts # Zustand state management
├── App.tsx             # Main app component
├── main.tsx           # React entry point
└── index.css          # Global styles
```

## 🎨 Customization

### Styling
- Modify `tailwind.config.js` for theme customization
- Update `src/index.css` for global styles
- Component-specific styles are in each component file

### Features
- Add new categories in the database
- Modify upload limits in `UploadModal.tsx`
- Customize batch operations in `Gallery.tsx`

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run deploy       # Deploy to Netlify
```

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue on GitHub
- Check the documentation
- Review Supabase documentation for backend issues

## 🔮 Roadmap

- [ ] User authentication
- [ ] Advanced image editing
- [ ] Video transcoding
- [ ] AI-powered tagging
- [ ] Social sharing
- [ ] Analytics dashboard
- [ ] Mobile app
- [ ] API endpoints
- [ ] Webhook integrations

---

Built with ❤️ using modern web technologies 