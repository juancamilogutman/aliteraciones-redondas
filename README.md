# Aliteraciones Nacionales

Visor de aliteraciones fonéticas en las letras del rock argentino — empezando por **Patricio Rey y sus Redonditos de Ricota** y sumando bandas (La Renga, etc.) desde la app.

SPA en **Vite + React + TypeScript + Tailwind v4 + Supabase**, con tema claro/oscuro y modo editor por magic-link.

## Puesta en marcha

```bash
npm install
cp .env.local.example .env.local         # completar con tus credenciales de Supabase
```

1. Crear un proyecto en [supabase.com](https://supabase.com) y copiar `Project URL` y `anon key` al `.env.local`.
2. Abrir el SQL editor del proyecto y pegar `supabase/schema.sql`. Eso crea las tablas, las políticas RLS y siembra las bandas y los álbumes.
3. Copiar también el `service_role key` al `.env.local` (sólo para el ingest, nunca al frontend).
4. Cargar las canciones desde el CSV:

   ```bash
   npm run ingest
   ```

5. Levantar el server local:

   ```bash
   npm run dev
   ```

## Modo editor

Para poder agregar/editar aliteraciones:

1. Hacer click en **Ingresar** y completar el email — Supabase envía un link.
2. Volver a la app desde ese link (sesión iniciada).
3. En el SQL editor de Supabase, una vez:

   ```sql
   insert into editors (user_id, email)
   select id, email from auth.users where email = 'tu@email.com';
   ```

4. Recargar — en cada canción aparece el botón **Editar**.

## Scripts

- `npm run dev` — server de desarrollo
- `npm run build` — typecheck + bundle de producción
- `npm run typecheck` — sólo typecheck
- `npm run lint` — ESLint
- `npm run ingest` — carga el CSV en Supabase

## Estructura

```
src/
├── components/       AppShell, AccountMenu, ThemeToggle, AlliterationView, AnnotationEditor
├── views/            Home, BandView, AlbumView, SongView, SongEditView
├── hooks/            useTheme, useAuth, useDiscography, useSong
└── lib/              supabase, markup parser, utils, slug, database.types
supabase/schema.sql   DDL + RLS + seed
scripts/              ingest-songs.ts
resources/            base_ricotera.csv, song-album-map.json
```

A brillar mi amor.
