# Storage Setup Guide for Insurance Policies

## Step 1: Set Up Environment Variables

You need to add these environment variables to your `.env.local` file (or Replit Secrets):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mbafzlqsfofxawwllvnj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_BUCKET_NAME=insurancePolicies
```

**OR** if you're using Replit and have them in `.replit` file, make sure you have:
- `SUPABASE_URL` (will work as fallback)
- `SUPABASE_ANON_KEY` (will work as fallback)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_NAME=insurancePolicies` (update from "files" to "insurancePolicies")

## Step 2: Create the Storage Bucket in Supabase

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Run the SQL Script**
   - Go to **SQL Editor** in the left sidebar
   - Click **New Query**
   - Copy and paste the contents of `supabase_storage_setup.sql`
   - Click **Run** (or press Ctrl+Enter)

   This will:
   - Create the `insurancePolicies` bucket
   - Set file size limit to 5MB
   - Allow only PDF, JPG, PNG files
   - Set up RLS (Row Level Security) policies for authenticated users

3. **Verify the Bucket**
   - Go to **Storage** in the left sidebar
   - You should see `insurancePolicies` bucket listed
   - Click on it to verify it's configured correctly

## Step 3: Update Environment Variables

Update your `.replit` file or environment variables:

```toml
[userenv.shared]
SUPABASE_BUCKET_NAME = "insurancePolicies"  # Changed from "files"
```

Or in `.env.local`:
```env
SUPABASE_BUCKET_NAME=insurancePolicies
```

## Step 4: Restart Your Application

After setting up the bucket and environment variables:
1. Restart your Next.js development server
2. Try uploading a file again

## Troubleshooting

### Error: "supabaseUrl is required"
- Make sure `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` is set
- Check your `.env.local` or Replit Secrets

### Error: "Missing Supabase Service Role Key"
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
- This key is different from the anon key
- Find it in Supabase Dashboard → Settings → API → service_role key

### Files not uploading
- Verify the bucket exists in Supabase Dashboard → Storage
- Check that RLS policies are created (run the SQL script)
- Check browser console and server logs for specific errors

### Bucket already exists
- If you see "bucket already exists" error, that's okay
- The SQL script uses `ON CONFLICT` to update existing buckets
- Just make sure the bucket name is `insurancePolicies`

## File Upload Limits

- **File Types**: PDF, JPG, PNG only
- **File Size**: Maximum 5MB per file
- **Files per Policy**: Maximum 5 files per policy

These limits are enforced on both frontend and backend.

