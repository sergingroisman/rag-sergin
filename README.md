# 🤖 RAG Sergin - Sistema RAG com Gemini

Sistema de Retrieval-Augmented Generation (RAG) usando **Gemini** para embeddings e geração de respostas, adaptado do rag-api.

## 🎯 Características

- ✅ **Gemini embeddings** (3072 dimensões, free tier)
- ✅ **Gemini 2.5 Flash** para geração de respostas (grátis e rápido)
- ✅ **Streaming SSE** em tempo real
- ✅ **Express API** com validação Zod
- ✅ **Qdrant** para busca vetorial
- ✅ **Interface web** para testes (chat.html)
- ✅ **TypeScript + ESM**

## 📦 Estrutura do Projeto

```
src/
├── config.ts                 # Configurações (GOOGLE_API_KEY, Qdrant, etc)
├── types.ts                  # Tipos TypeScript
├── index.ts                  # Servidor Express principal
├── middleware/
│   ├── errorHandler.ts       # Error handling
│   └── validation.ts         # Validação Zod
├── routes/
│   ├── rag.ts               # Rotas RAG (POST /rag, POST /rag/stream)
│   └── query.ts             # Rotas de busca (POST /query)
├── schemas/
│   └── index.ts             # Schemas Zod
└── services/
    ├── gemini.ts            # Configuração Gemini (embeddings + LLM)
    ├── qdrant.ts            # Cliente Qdrant
    ├── query.ts             # Serviço de busca vetorial
    └── rag.ts               # Serviço RAG (query + stream)

sample/
└── chat.html                # Interface de teste
```

## 🚀 Como Usar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Certifique-se que seu `.env` tem:

```env
GOOGLE_API_KEY=sua_chave_aqui
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents
SERVER_PORT=3000
```

### 3. Iniciar o servidor

```bash
npm run dev
```

Você verá:

```
Coleção 'documents' já existe no Qdrant.
✔︎ Server is running on port 3000
```

### 4. Testar no navegador

Abra o arquivo `sample/chat.html` **diretamente no navegador** (duplo clique):

```
file:///Users/avanade/Workspace/rag-sergin/sample/chat.html
```

- Digite sua pergunta
- Clique em "Enviar"
- Veja as **fontes** aparecendo primeiro
- Veja a **resposta streaming** em tempo real

**Exemplo de pergunta:**
- "O que é a arquitetura limpa?"
- "Quais são os princípios SOLID?"
- "O que é a regra de dependência?"

## 🔌 Endpoints da API

### 1. RAG Standard (resposta completa)

```bash
curl -X POST http://localhost:3000/rag \
  -H "Content-Type: application/json" \
  -d '{
    "question": "O que é arquitetura limpa?",
    "topK": 3
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "question": "O que é arquitetura limpa?",
    "answer": "Arquitetura limpa é...",
    "sources": [
      {
        "fileName": "Arquitetura-Limpa.pdf",
        "chunkIndex": 5,
        "score": 0.89
      }
    ]
  }
}
```

### 2. RAG Streaming (SSE)

```bash
curl -N -X POST http://localhost:3000/rag/stream \
  -H "Content-Type: application/json" \
  -d '{
    "question": "O que é arquitetura limpa?",
    "topK": 3
  }'
```

**Formato SSE:**
```
data: {"type":"sources","content":[{...}]}

data: {"type":"token","content":"Arquitetura"}

data: {"type":"token","content":" limpa"}

data: {"type":"done"}
```

### 3. Busca Vetorial (sem LLM)

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "SOLID",
    "topK": 5
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "question": "SOLID",
    "results": [
      {
        "id": "abc123",
        "text": "Conteúdo do chunk...",
        "score": 0.92,
        "metadata": {
          "documentId": "doc-1",
          "fileName": "Arquitetura-Limpa.pdf",
          "chunkIndex": 10,
          "page": 25
        }
      }
    ],
    "retrievedChunks": 5
  }
}
```

## 📄 Adicionar Novos Documentos

Atualmente o sistema usa o documento já processado (`Arquitetura-Limpa.pdf`). Para adicionar novos:

### Opção 1: Processar via código

Use o serviço `processDocument` (já existe em `services/document.ts`):

```typescript
import { processDocument } from "./services/document";

await processDocument({
  fileName: "meu-documento.pdf",
  filePath: "./uploads/meu-documento.pdf"
});
```

### Opção 2: Upload via API (próximo passo)

Será implementado em `routes/document.ts` para upload de PDF/EPUB/CSV.

## 🎨 Personalizar Prompts

Edite `src/services/rag.ts`:

```typescript
const RAG_PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Você é um especialista em [SEU DOMÍNIO].

    Regras:
    - Use apenas o contexto fornecido
    - Cite fontes com [fonte: arquivo]
    - Responda em Português`,
  ],
  ["user", `CONTEXTO:\n{context}\n\nPERGUNTA:\n{question}`],
]);
```

## 🔧 Configurações Avançadas

### Ajustar modelo Gemini

Em `src/services/gemini.ts`:

```typescript
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",  // ou "gemini-2.5-pro"
  temperature: 0,              // 0 = determinístico, 1 = criativo
});
```

### Ajustar parâmetros de busca

Em `src/schemas/index.ts`:

```typescript
topK: z.number()
  .min(1)
  .max(10)    // Máximo de chunks retornados
  .default(3) // Padrão
```

## 📊 Status

✅ **Funcionando:**
- RAG com Gemini
- Streaming SSE
- Busca vetorial
- Chat interface
- Validação de inputs
- Error handling

🚧 **Próximos passos:**
- Upload de documentos via API
- Suporte a EPUB
- Suporte a CSV
- Métricas e logging
- Testes automatizados

## 🐛 Troubleshooting

### Erro: "GOOGLE_API_KEY is not set"

Configure no `.env`:
```env
GOOGLE_API_KEY=sua_chave_aqui
```

### Erro: "Coleção não existe"

O servidor cria automaticamente. Se persistir:

```bash
# Verificar se Qdrant está rodando
curl http://localhost:6333/collections
```

### Chat.html não conecta

1. Certifique-se que o servidor está rodando (`npm run dev`)
2. Verifique o console do navegador (F12)
3. CORS está habilitado (`origin: "*"`)

## 📝 Licença

ISC
