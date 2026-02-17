# RagSergin Architecture

## Data Flow
Client → Express → Supabase → Langchain → QDrant → User

## Key Decisions
- Auth: Supabase (supabase-js)
- 

## File Structure
rag-sergin/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   └── plugins/
│   │       ├── swagger.ts
│   │       └── cors.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env (create manually with API key)
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── components/ui/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── .gitignore

## External Docs
- Supabase: https://supabase.com/docs
- QDrant: https://qdrant.tech/documentation/
- Langchain: https://docs.langchain.com/oss/javascript/langchain/overview