# Documentación Técnica: RAG Cursos

Sistema de gestión de cursos con capacidades de búsqueda RAG (Retrieval-Augmented Generation) integrado con **Supabase** y **Google Gemini**.

## 1. Arquitectura General

La aplicación sigue una arquitectura de Single Page Application (SPA) moderna:
- **Frontend**: React 19 con Vite y TypeScript.
- **Backend-as-a-Service**: Supabase para base de datos, autenticación y almacenamiento.
- **AI/LLM**: Google Gemini para generación de embeddings y futuras consultas RAG.

## 2. Modelos de Datos (Supabase/PostgreSQL)

### Tabla: `locations`
Almacena las sedes del instituto.
- `id` (uuid): Identificador único.
- `name` (text): Nombre de la sede (ej. "Dominican Republic").
- `country_code` (text): Código único de país (ej. "DO", "VE").

### Tabla: `courses`
Almacena la información principal de los cursos.
- `id` (uuid): Identificador único.
- `title` (text): Título del curso.
- `description` (text): Descripción detallada.
- `location_id` (uuid): Relación con `locations`.
- `content_text` (text): Texto extraído de los materiales (PDF) para RAG.
- `pdf_url` (text): URL del archivo en Supabase Storage.
- `is_active` (boolean): Estado de visibilidad.

### Tabla: `course_schedules`
Gestiona las fechas y vigencia de los cursos.
- `course_id` (uuid): Relación con `courses`.
- `start_date` (date): Fecha de inicio.
- `end_date` (date): Fecha de fin.
- `is_active` (boolean): Si el horario está vigente.

### Tabla: `course_embeddings`
Almacena los vectores para búsqueda semántica.
- `course_id` (uuid): Relación con `courses`.
- `content` (text): Fragmento de texto.
- `embedding` (vector(768)): Vector generado por Gemini (768 dimensiones).

## 3. Lógica de Funciones Principales

### `src/lib/gemini.ts`
- **`generateEmbedding(text: string)`**: Toma un bloque de texto y utiliza el modelo `gemini-embedding-001` de Google con `outputDimensionality: 768` para devolver un vector numérico que coincida con la base de datos.

### `src/lib/supabase.ts`
- Configuración del cliente de Supabase utilizando variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### `src/pages/courses/CourseCreatePage.tsx`
- **`extractTextFromPDF(file: File)`**: Utiliza `pdfjs-dist` para leer el contenido de un PDF página por página y convertirlo a texto plano.
- **`handleSubmit(e: FormEvent)`**:
    1. Extrae el texto del PDF subido.
    2. Sube el archivo físico a Supabase Storage (`course-pdfs`).
    3. Registra el curso en la tabla `courses`.
    4. Registra el horario en `course_schedules`.
    5. **Genera Embeddings**: Llama a `generateEmbedding` con el texto extraído y lo guarda en `course_embeddings` para permitir búsquedas inteligentes futuras.

### `src/pages/courses/CourseListPage.tsx`
- **`fetchCourses()`**: Consulta cursos con joins a `locations` y `schedules`.
- **`isAvailable(schedules)`**: Lógica de negocio que determina si un curso es "Disponible" basándose en la fecha actual y el intervalo de fechas del programa.

## 4. Funciones de Base de Datos (SQL)

- **`match_active_courses`**: Función en PostgreSQL que recibe un vector de consulta y realiza una búsqueda de similitud de coseno contra los embeddings almacenados, filtrando solo cursos con horarios activos.
- **`cleanup_inactive_course_embeddings`**: Trigger que elimina automáticamente los embeddings asociados a un curso cuando este se marca como inactivo.

## 5. Próximos Pasos (RAG)
El sistema está preparado para implementar una interfaz de Chat donde:
1. El usuario hace una pregunta.
2. La pregunta se convierte a embedding (768 dim).
3. Se busca en `match_active_courses`.
4. Los resultados se pasan a Gemini (Pro/Flash) como contexto para generar una respuesta precisa sobre los cursos.
