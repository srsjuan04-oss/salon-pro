# Salon Flow

deseo realizar una aplicacion para que las barberias, salones de belleza  y negocios similares de servicio puedan :

Analizar sus ventas y comisiones de los que trabajan en el salon 
Agendar por medio de un calendario qye se conecte a calendario de google y apple
Gestionar sus clientes, queremos que los clientes gestionen sus citas ellos mismos, ademas que se conecte a wpp por medio de api o whats app web para conectar una ia que responda automatixcamente  y agende automaticamente en las franjas disponibles

Stack: Vite + React + TypeScript + shadcn/ui, con [Supabase](https://supabase.com) como backend (base de datos, auth, storage y edge functions) y despliegue en [Vercel](https://vercel.com).

## Desarrollo local

Este proyecto usa [Bun](https://bun.sh).

```sh
git clone https://github.com/srsjuan04-oss/salon-pro.git
cd salon-pro
bun install
bun run dev
```

## Backend (Supabase)

Las credenciales del proyecto Supabase están en `.env` (URL y clave pública `anon`). Las migraciones SQL y las edge functions viven en `supabase/`.

## Despliegue

El despliegue de producción se hace en Vercel, conectado a este repositorio: cada push a `main` dispara un nuevo build y despliegue.
