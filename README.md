# RemitosApp

App mobile-first para gestión de remitos de carga. Los choferes suben remitos con fotos desde el celular; el admin los visualiza y marca como pagados.

## Setup rápido

### 1. Supabase — Base de datos

1. Crear proyecto en [supabase.com](https://supabase.com)
2. En **SQL Editor**, pegar y ejecutar el contenido de `supabase/schema.sql`
3. En **Storage → Buckets**, crear un bucket llamado `remito-fotos` con acceso **público**

### 2. Credenciales

Abrir `js/app.js` y reemplazar las tres constantes al inicio:

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';   // Project URL
const SUPABASE_ANON_KEY = 'eyJh...';                    // anon public key
const ADMIN_PASSWORD    = 'ypf2024';                    // cambiar por algo seguro
```

Las primeras dos se encuentran en Supabase → **Settings → API**.

### 3. Deploy

Subir los archivos a Vercel, Netlify o cualquier hosting estático. No hay build step.

---

## Uso

### Choferes
- Primera vez: ingresan su nombre → queda guardado en el dispositivo
- Cargan remitos con fecha, destino ida/vuelta, litros, comentarios y fotos obligatorias

### Admin
- En la pantalla de bienvenida: tocar **"Soy administrador"** e ingresar la contraseña
- Ver remitos **pendientes** o el **historial completo**
- Filtrar por chofer y por mes
- Marcar remitos como pagados (queda registrada la fecha)

---

## Estructura

```
index.html          Shell HTML
css/styles.css      Todos los estilos
js/app.js           Toda la lógica (vanilla JS)
supabase/schema.sql Tablas, índices y políticas RLS
```
