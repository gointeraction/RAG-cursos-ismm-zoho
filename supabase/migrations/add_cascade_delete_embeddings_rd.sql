-- Migration: Add ON DELETE CASCADE to course_embeddings (Venezuela) and course_embeddings_rd (RD)
-- When a course is deleted, its embeddings in both tables are also deleted automatically.

-- === course_embeddings (Venezuela) ===
ALTER TABLE public.course_embeddings
    DROP CONSTRAINT IF EXISTS course_embeddings_course_id_fkey;

ALTER TABLE public.course_embeddings
    ADD CONSTRAINT course_embeddings_course_id_fkey
    FOREIGN KEY (course_id)
    REFERENCES public.courses(id)
    ON DELETE CASCADE;

DELETE FROM public.course_embeddings
WHERE course_id IS NULL
   OR course_id NOT IN (SELECT id FROM public.courses);

-- === course_embeddings_rd (República Dominicana) ===
ALTER TABLE public.course_embeddings_rd
    DROP CONSTRAINT IF EXISTS course_embeddings_rd_course_id_fkey;

ALTER TABLE public.course_embeddings_rd
    ADD CONSTRAINT course_embeddings_rd_course_id_fkey
    FOREIGN KEY (course_id)
    REFERENCES public.courses(id)
    ON DELETE CASCADE;

DELETE FROM public.course_embeddings_rd
WHERE course_id IS NULL
   OR course_id NOT IN (SELECT id FROM public.courses);
