# Deployment Guide - Cloudflare Pages

## Prerequisites
- GitHub account
- Cloudflare account (free tier is enough)
- Supabase project already set up

## Option 1: Deploy via GitHub (Recommended)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - QA Test Management"
git branch -M main
git remote add origin https://github.com/yourusername/qa-test-management.git
git push -u origin main
```

### Step 2: Connect to Cloudflare Pages

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create Application** → **Pages**
3. Click **Connect to Git**
4. Select your repository: `qa-test-management`
5. Click **Begin setup**

### Step 3: Configure Build Settings

**Build settings:**
```
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: / (leave empty)
```

**Environment variables:** (Click "Add variable")
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-public-key
```

### Step 4: Deploy
1. Click **Save and Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Your app is live! 🎉

**Your URL will be:** `https://qa-test-management-xxx.pages.dev`

### Step 5: Custom Domain (Optional)

1. In Cloudflare Pages project settings
2. Go to **Custom domains** → **Set up a domain**
3. Add your domain (e.g., `qa.yourdomain.com`)
4. Cloudflare will automatically configure DNS

## Option 2: Direct Upload via Wrangler CLI

### Step 1: Install Wrangler
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```

### Step 3: Build Your Project
```bash
npm run build
```

### Step 4: Deploy
```bash
wrangler pages deploy dist --project-name=qa-test-management
```

### Step 5: Add Environment Variables
After first deployment:
1. Go to Cloudflare Dashboard → Pages → Your project
2. Settings → Environment variables
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy: `wrangler pages deploy dist --project-name=qa-test-management`

## Environment Variables Setup

### Production Variables
In Cloudflare Dashboard → Settings → Environment variables:

**Production environment:**
```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...your-key
```

### Preview Environment (Optional)
For preview deployments (branches):
```
VITE_SUPABASE_URL = https://staging-xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...staging-key
```

## Automatic Deployments

Once connected to GitHub:
- ✅ Push to `main` branch → Auto deploy to production
- ✅ Push to other branches → Auto deploy to preview URL
- ✅ Pull requests → Preview deployment with unique URL

## Build Optimization

### 1. Enable Build Cache
Cloudflare automatically caches `node_modules` between builds.

### 2. Optimize Bundle Size
Already configured in `vite.config.ts`:
```javascript
build: {
  outDir: 'dist',
  sourcemap: false, // Disable for production
}
```

### 3. Check Build Performance
View build logs in Cloudflare Dashboard → Deployments → View details

## Troubleshooting

### Build Failed: "Command not found: npm"
- Cloudflare uses Node.js 18 by default
- To change: Settings → Environment variables → `NODE_VERSION = 18`

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Redeploy after adding variables
- Check variables are in correct environment (Production vs Preview)

### 404 on Page Refresh
- Cloudflare Pages automatically handles SPA routing for Vite
- If issues persist, check `Functions` tab → ensure `_routes.json` is not blocking

### Database Connection Issues
- Verify Supabase URL is correct (check trailing slashes)
- Test anon key in browser console: `https://yourproject.supabase.co/rest/v1/`
- Check Supabase RLS policies are enabled

### Build Takes Too Long
Normal build time: 2-4 minutes
If longer:
- Check for large dependencies
- Consider removing unused packages
- Review `package.json` for dev dependencies in `dependencies`

## Monitoring & Analytics

### Enable Web Analytics (Free)
1. Go to Cloudflare Dashboard → Analytics → Web Analytics
2. Enable for your Pages project
3. View traffic, performance, and user insights

### View Build Logs
- Deployments → Click on deployment → View build log
- Check for warnings or errors

### Deployment History
- View all deployments in Deployments tab
- Rollback to previous version if needed

## Security Best Practices

### ✅ What's Already Configured
- HTTPS enabled by default
- Environment variables encrypted
- Supabase RLS policies active
- No sensitive data in client-side code

### ⚠️ Important Notes
- Never commit `.env` file to Git
- Don't expose Supabase `service_role` key (use `anon` key only)
- Storage bucket is public (attachments accessible via URL)
- For private attachments, modify storage policies

## Performance Tips

### 1. Enable HTTP/3
Cloudflare automatically enables HTTP/3 for all Pages.

### 2. Image Optimization
For uploaded images, consider using Cloudflare Images:
```javascript
// Example: Resize images before upload
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
```

### 3. Caching Strategy
Static assets cached automatically by Cloudflare CDN.

## Scaling Considerations

### Free Tier Limits (Cloudflare Pages)
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds per month
- ✅ 1 build at a time

### Upgrade If Needed
- Faster builds
- More concurrent builds
- Advanced preview deployments

### Supabase Free Tier
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 50k monthly active users

## Backup & Disaster Recovery

### Database Backups
Supabase automatically backs up your database daily (Pro tier).

For free tier:
```bash
# Export data manually
pg_dump your-db-url > backup.sql
```

### Code Versioning
Git commits serve as version history. To rollback:
1. Cloudflare Dashboard → Deployments
2. Find working deployment
3. Click **Rollback to this deployment**

## Next Steps After Deployment

1. ✅ Test authentication (signup/login)
2. ✅ Create a test project
3. ✅ Add sample test cases
4. ✅ Execute a test run with attachments
5. ✅ Share URL with your QA team

## Support

- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev

## Summary

Your QA Test Management app is now:
- 🚀 Deployed globally via Cloudflare's CDN
- 🔒 Secured with HTTPS and authentication
- 📊 Connected to Supabase database
- 📦 Automatically deployed on every push
- 💾 Storing attachments in Supabase Storage

**Deployment URL:** `https://your-project.pages.dev`

Enjoy your production-ready QA test management system! 🎉
