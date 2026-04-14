-- Migration: Add ON DELETE CASCADE to course_embeddings_rd
-- When a course is deleted, its embeddings in course_embeddings_rd should also be deleted automatically.

-- Drop existing foreign key if it exists (without cascade)
ALTER TABLE public.course_embeddings_rd
    DROP CONSTRAINT IF EXISTS course_embeddings_rd_course_id_fkey;

-- Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE public.course_embeddings_rd
    ADD CONSTRAINT course_embeddings_rd_course_id_fkey
    FOREIGN KEY (course_id)
    REFERENCES public.courses(id)
    ON DELETE CASCADE;

-- Clean up any orphaned embeddings (where course_id is NULL or references a non-existent course)
DELETE FROM public.course_embeddings_rd
WHERE course_id IS NULL
   OR course_id NOT IN (SELECT id FROM public.courses);
