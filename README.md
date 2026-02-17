# 🤖 RAG Sergin - Sistema RAG com DeepSeek & Local Embeddings

Sistema de Retrieval-Augmented Generation (RAG) usando **DeepSeek** para geração de respostas e **HuggingFace Local Embeddings** para vetorização.

## 🎯 Características

- ✅ **Local Embeddings** (Xenova/bge-small-en-v1.5, offline)
- ✅ **DeepSeek V3** (deepseek-chat) para geração de respostas (rápido e econômico)
- ✅ **Streaming SSE** em tempo real
- ✅ **Express API** com validação Zod
- ✅ **Qdrant** para busca vetorial
- ✅ **Interface web** para testes (chat.html)
- ✅ **TypeScript + ESM**

## 📦 Estrutura do Projeto

```
src/
├── config.ts                 # Configurações (DEEPSEEK_API_KEY, Qdrant, etc)
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
    ├── providers.ts         # Configuração AI (DeepSeek + Local Embeddings)
    ├── qdrant.ts            # Cliente Qdrant
    ├── query.ts             # Serviço de busca vetorial
    └── rag.ts               # Serviço RAG (query + stream)

sample/
└── chat.html                # Interface de teste

bruno/                       # Coleção de requests para o Bruno Client
├── documents/               # Upload, processamento de URL, Stats
├── rag/                     # RAG Query, Validação, Stream
└── vectors/                 # Busca Vetorial
```

## 📁 Coleção Bruno

O projeto inclui uma coleção pronta para o **[Bruno API Client](https://www.usebruno.com/)**.

1. Instale o Bruno.
2. Abra a pasta `bruno/` como uma coleção (`Open Collection`).
3. Use os requests pré-configurados para testar a API rapidamente.

## 🚀 Como Usar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Certifique-se que seu `.env` tem:

```env
DEEPSEEK_API_KEY=sua_chave_aqui
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

### 4. Upload de Documentos

```bash
curl -X POST http://localhost:3000/documents/upload \
  -F "file=@/caminho/para/arquivo.pdf"
```

### 5. Processar URL

```bash
curl -X POST http://localhost:3000/documents/from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pt.wikipedia.org/wiki/Solid_(orientação_a_objetos)",
    "scraperEngine": "cheerio"
  }'
```

### 6. Estatísticas da Coleção

```bash
curl http://localhost:3000/documents/stats
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

### Opção 2: Upload via API (Recomendado)

Use o endpoint `/documents/upload` para enviar arquivos PDF diretamente, ou `/documents/from-url` para processar páginas web. Use a coleção do **Bruno** para facilitar.

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

Em `src/services/providers.ts`:

```typescript
export const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0,
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
- RAG com DeepSeek
- Local Embeddings (offline)
- Streaming SSE
- Busca vetorial
- Chat interface
- Validação de inputs
- Error handling
- Upload de documentos via API (PDF)
- Processamento de URLs (Web Scraping)

🚧 **Próximos passos:**
- Suporte a EPUB
- Suporte a CSV
- Métricas e logging
- Testes automatizados

## 🐛 Troubleshooting

### Erro: "DEEPSEEK_API_KEY is not set"

Configure no `.env`:
```env
DEEPSEEK_API_KEY=sua_chave_aqui
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
