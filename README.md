# Matchpoint App

Plataforma web para la comunidad de padel orientada a organizadores y jugadores, con enfoque inicial en auto-gestión de torneos.

## Visión

Matchpoint es una plataforma diseñada para que los dueños de establecimientos de padel puedan:
- Crear y gestionar torneos completos
- Administrar inscripciones de parejas
- Organizar zonas (grupos) de competencia
- Asignar canchas a los partidos
- Publicar información del torneo para jugadores

En futuras versiones, los jugadores tendrán perfiles personales con historial, estadísticas y rankings.

## Stack tecnológico

- **Frontend**: Next.js 16 (App Router) + TypeScript + React 19
- **Estilos**: Tailwind CSS + shadcn/ui + @base-ui/react
- **Componentes**: react-day-picker (calendar), lucide-react (iconos)
- **Validación**: react-hook-form 7 + Zod 4
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Deploy**: Cloudflare Pages
- **Tema**: Azul profesional (#3B82F6) sobre azul noche, token-based

## Requisitos previos

- Node.js v24.16.0+ (con npm 11.x)
- Cuenta Supabase con variables de entorno configuradas

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
# Copiar .env.example y completar con credenciales Supabase
cp .env.example .env.local
```

## Desarrollo

```bash
# Servidor de desarrollo (ejecuta en puerto 3000)
npm run dev

# Linting del código
npm run lint

# Build de producción
npm run build

# Servir build de producción localmente
npm run start

# Aplicar migraciones SQL pendientes a Supabase
npm run db:apply

# Cargar data fake en un torneo (testing)
npm run seed:registrations -- <tournament-id> [num-pairs]
```

## Estructura del proyecto

```
src/
├── app/               # App Router + páginas
│   ├── (auth)/        # Área de login/registro
│   ├── dashboard/     # Dashboard del organizador
│   ├── courts/        # Gestión de canchas
│   ├── tournaments/   # CRUD y gestión de torneos
│   └── t/            # Área pública de torneo
├── components/        # Componentes reutilizables
├── lib/
│   ├── supabase/     # Clientes (client, server, admin)
│   ├── domain/       # Lógica de negocio
│   ├── validation/   # Esquemas zod
│   └── types/        # Tipos TypeScript
└── proxy.ts          # Middleware de autenticación
```

## Características implementadas (v1 — MVP)

### Organizer
- ✅ Registro e inicio de sesión
- ✅ CRUD de canchas (outdoor/indoor)
- ✅ Creación de torneos con:
  - Categorías (Individual 1ra-8va o Suma)
  - Género (Masculino, Femenino, Mixto)
  - Gestión de cupos y fechas
- ✅ Ciclo de vida completo del torneo
- ✅ Gestión de inscripciones (aceptar/rechazar/remover parejas)
- ✅ Generación automática de zonas (round-robin)
- ✅ Modificación manual de zonas antes de publicar
- ✅ Asignación opcional de cancha a partidos

### Jugadores (inscripción pública)
- ✅ Formulario de inscripción de pareja sin login
- ✅ Consulta de estado por token único (sin autenticación)
- ✅ Visualización de zonas y partidos (una vez publicados)

## Interfaz y experiencia de usuario

- **Tema**: Azul deportivo profesional (#3B82F6) sobre azul noche. Colores token-based en `globals.css` para cambios parejos en toda la app.
- **Calendar date picker**: Calendario interactivo con popover para seleccionar fechas (fecha del torneo y apertura automática de inscripción). Captions en español (Intl), fechas pasadas deshabilitadas.
- **Loading states**: Spinners visuales en navegación para feedback inmediato durante transiciones de rutas.
- **Share registration link**: Panel en detalle del torneo con URL copiable, botón "Abrir página pública", y mensajes contextuales sobre estado de inscripción (abierta/cerrada con horarios si está configurada apertura automática).
- **Labels claros**: Botones del ciclo de vida muestran acciones ("Publicar", "Abrir inscripción", "Cerrar inscripción") en lugar de destinos.
- **Responsive**: Diseño adaptable a móvil y desktop (grid escalable, padding proporcional).

## Convenciones de implementación

### Acceso a datos
- **Área protegida**: Server Actions (`src/app/<ruta>/actions.ts`) con autenticación obligatoria
- **Área pública**: Vistas SQL seguras + RPCs SECURITY DEFINER que validan reglas en base de datos
- **Protección de rutas**: Validación en proxy + revalidación en cada página

### Validación
- React Hook Form 7 + Zod 4 + @hookform/resolvers
- Validación tanto en cliente como en servidor

### Base de datos
- RLS (Row Level Security) activo en todas las tablas
- Migraciones en `supabase/migrations/`
- Tokens únicos generados con `gen_random_uuid()`

## Modelo de datos clave

- **Organizer**: Dueño del establecimiento, tiene login y crea torneos
- **Court**: Cancha física del organizador (outdoor/indoor)
- **Tournament**: Evento con categoría, género y cupos
- **Pair**: Pareja de jugadores (unidad de inscripción)
- **Player**: Jugador individual (se guardará sin login en v1 para vinculación futura)
- **Zone**: Grupo de parejas en formato round-robin
- **Match**: Partido entre dos parejas dentro de una zona

## Ciclo de vida del torneo

```
Borrador → Publicado → Inscripción abierta → Inscripción cerrada → En curso → Finalizado
```

Las transiciones son unidireccionales.

## Próximas versiones

- **v2** (especificada en `spec-v2.md`): calendario público del organizador + QR, anti-duplicado de inscripción por email, resultados/scoring de partidos, standings de zona, bracket (eliminación directa) y seguimiento en vivo (Realtime)
- **v3**: Notificaciones y transmisión en vivo
- **v4**: Login y perfiles de jugador con estadísticas y rankings
- **v5**: Gestión avanzada de disponibilidad de canchas y pagos

## Variables de entorno requeridas

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<url-del-proyecto>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave-publica>
SUPABASE_SERVICE_ROLE_KEY=<clave-privada>
```

## Referencias internas

- `CLAUDE.md` — Instrucciones detalladas para desarrollo
- `spec.md` — Especificación técnica de v1
- `spec-v2.md` — Especificación técnica de v2
- `functional-doc.md` — Análisis funcional completo
