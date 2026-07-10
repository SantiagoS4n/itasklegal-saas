# iTaskLegal CRM

CRM profesional para iTaskLegal — React + Vite + Supabase.

## Requisitos
- Node.js 18+
- Cuenta en Supabase con la BD ya creada

## Instalación local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Correr en desarrollo
npm run dev
# → http://localhost:5173
```

## Deploy en Netlify (recomendado)

### Opción A — Netlify CLI (más rápido)
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Opción B — GitHub + Netlify (automático)
1. Sube el proyecto a un repo de GitHub
2. En Netlify: Add new site → Import from Git → elige el repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Environment variables: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
6. Deploy — cada `git push` hace deploy automático

## Estructura del proyecto

```
src/
├── lib/supabase.js          ← cliente Supabase (singleton)
├── context/AuthContext.jsx  ← sesión y usuario global
├── hooks/useToast.js        ← notificaciones
├── utils/format.js          ← fmtMoney, safeUrl, initials
│
├── components/
│   ├── layout/              ← AppLayout, Sidebar, Topbar
│   └── ui/                  ← Button, Modal, Toast, ComingSoon, etc.
│
├── modules/
│   ├── auth/Login.jsx
│   ├── home/Home.jsx
│   ├── lawfirms/LawFirms.jsx
│   ├── assistants/Assistants.jsx
│   ├── invoices/             ← próximo
│   ├── payments/             ← próximo
│   ├── bizcards/             ← próximo
│   └── analytics/            ← próximo
│
└── styles/
    ├── base.css             ← reset y fuentes
    ├── variables.css        ← tokens de diseño (colores, radios, etc.)
    └── table.module.css     ← estilos compartidos de tablas
```

## Agregar un módulo nuevo

1. Crea `src/modules/tunombre/TuModulo.jsx` siguiendo el patrón de `LawFirms.jsx`
2. Agrega la ruta en `src/App.jsx`
3. Agrega el ítem de nav en `src/components/layout/Sidebar.jsx`
4. Listo — el layout, auth y toast ya funcionan automáticamente
