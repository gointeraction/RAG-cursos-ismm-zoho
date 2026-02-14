# RAG Cursos - Course Management System

Sistema de gestión de cursos para **Instituto Superior Mariano Moreno** con integración RAG para búsqueda inteligente de contenido.

## 🚀 Características

- ✅ Autenticación segura con Supabase Auth
- ✅ Gestión completa de cursos (crear, listar, filtrar)
- ✅ Carga de PDFs con extracción automática de texto
- ✅ Filtrado por ubicación (República Dominicana / Venezuela)
- ✅ Indicadores de disponibilidad basados en fechas
- ✅ Almacenamiento en Supabase Storage
- ✅ Base de datos preparada para RAG (texto extraído almacenado)

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Libraries**: React Router, Lucide Icons, date-fns, pdfjs-dist

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## 🔧 Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### Base de Datos

El esquema SQL se encuentra en `supabase/schema.sql`. Aplicar en tu proyecto Supabase.

## 📖 Uso

1. **Login**: Crear usuario en Supabase Auth
2. **Ver Cursos**: Lista de cursos con filtros
3. **Agregar Curso**: Formulario completo con carga de PDF
4. **Filtrar**: Por ubicación (RD/Venezuela)

## 🗂️ Estructura del Proyecto

```
src/
├── components/      # Componentes reutilizables
├── contexts/        # Context providers (Auth)
├── lib/            # Configuración (Supabase client)
├── pages/          # Páginas de la aplicación
│   ├── courses/    # Páginas de cursos
│   ├── LoginPage.tsx
│   └── DashboardPage.tsx
├── types/          # TypeScript types
└── App.tsx         # Configuración de rutas
```

## 🧪 Testing

Ver `TESTING.md` para instrucciones detalladas de prueba.

## 📝 Próximos Pasos

- [ ] Edición y eliminación de cursos
- [ ] Vista de detalle de curso
- [ ] Integración RAG para búsqueda inteligente
- [ ] Dashboard de analytics
- [ ] Deployment a producción

## 📄 Licencia

MIT

## 👥 Autor

Desarrollado para Instituto Superior Mariano Moreno
