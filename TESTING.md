# Testing Instructions for RAG Cursos

## Prerequisites
1. Application is running at http://localhost:5173/
2. Supabase project is active and configured

## Step 1: Create Test User

Since we're using Supabase Auth, you need to create a test user:

### Option A: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/vxwlvhxalepzpsmqvymm
2. Navigate to Authentication > Users
3. Click "Add User"
4. Create user with:
   - Email: `admin@test.com`
   - Password: `admin123456`
5. Confirm the user

### Option B: Via SQL (if email confirmation is disabled)
Run this in Supabase SQL Editor:
```sql
-- This only works if email confirmation is disabled in Auth settings
```

## Step 2: Test Login
1. Open http://localhost:5173/
2. You should be redirected to `/login`
3. Enter credentials:
   - Email: `admin@test.com`
   - Password: `admin123456`
4. Click "Sign In"
5. You should be redirected to `/dashboard/courses`

## Step 3: Test Course List
1. Verify you see 2 sample courses:
   - Culinary Arts Fundamentals (Dominican Republic)
   - Advanced Pastry Techniques (Venezuela)
2. Check availability badges:
   - Both should show "Available" (green) since dates are in 2026
3. Test location filter:
   - Select "Dominican Republic" - should show only 1 course
   - Select "Venezuela" - should show only 1 course
   - Select "All Locations" - should show both courses

## Step 4: Test Add Course Form
1. Click "Add Course" in the navigation menu
2. Fill in the form:
   - **Title**: "Baking Essentials"
   - **Description**: "Learn fundamental baking techniques and recipes"
   - **Location**: Select "Dominican Republic"
   - **Start Date**: 2026-03-01
   - **End Date**: 2026-05-31
3. Upload a PDF file (any PDF will work for testing)
4. Click "Create Course"
5. Wait for:
   - PDF text extraction (you'll see "Extracting PDF..." message)
   - Upload to complete
6. You should be redirected to course list
7. Verify new course appears in the list

## Step 5: Verify Database
Check Supabase to confirm:
1. New course record in `courses` table
2. `content_text` field contains extracted PDF text
3. `pdf_url` field contains storage URL
4. New schedule record in `course_schedules` table

## Expected Results

✅ Login works with test credentials  
✅ Course list displays with correct data  
✅ Location filtering works  
✅ Availability badges show correct status  
✅ Add course form accepts all inputs  
✅ PDF upload and text extraction works  
✅ New course appears in list after creation  
✅ Database stores all data correctly  

## Troubleshooting

**Login fails**: Check Supabase Auth settings and user creation  
**PDF extraction fails**: Check browser console for pdf.js errors  
**Upload fails**: Check Supabase Storage bucket permissions  
**No courses shown**: Check database has sample data  
