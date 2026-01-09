# Supabase Storage Bucket Setup

## Task Files Bucket

A new storage bucket named `taskFiles` needs to be created in Supabase for storing task-related file attachments.

### Manual Setup Steps

1. **Login to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** or **"Create bucket"** button
   - Bucket name: `taskFiles`
   - Set as **Private** (not public)
   - Optional: Set file size limit to 5MB
   - Click **"Create bucket"**

3. **Configure Bucket Settings** (Optional but Recommended)
   - File size limit: 5MB (5242880 bytes)
   - Allowed MIME types (if supported):
     - `application/pdf`
     - `application/msword` (.doc)
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
     - `application/vnd.ms-excel` (.xls)
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`

4. **Set RLS Policies** (if needed)
   - The application uses service role key for file operations, so RLS policies may not be required
   - If you want to add RLS policies, ensure service_role can access the bucket

### Automatic Creation

The application will attempt to automatically create the `taskFiles` bucket when files are uploaded if:
- The service role key has bucket creation permissions
- The bucket doesn't already exist

However, it's recommended to create the bucket manually through the Supabase dashboard to ensure proper configuration.

### File Limits

- **Maximum files per task**: 5 files
- **Maximum file size**: 5MB per file
- **Allowed formats**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (JPG, PNG, GIF, WebP)

### Notes

- Files uploaded to tasks are stored in the `taskFiles` bucket
- Files cannot be deleted after uploading (by design)
- All file operations use the service role key for authentication
