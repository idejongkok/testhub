// Cloudflare Pages build script
// This script ensures environment variables are available during build

import { execSync } from 'child_process'
import fs from 'fs'

// Write environment variables to .env.production for Vite to pick up
const envContent = `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || ''}
VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || ''}
`

console.log('Writing environment variables...')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING')
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')

fs.writeFileSync('.env.production', envContent)

console.log('Running build...')
execSync('vite build', { stdio: 'inherit' })
