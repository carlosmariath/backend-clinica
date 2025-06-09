# 🚀 Deploy no Railway

Este guia te ajudará a fazer o deploy da API da clínica no Railway.

## 📋 Pré-requisitos

1. **Conta no Railway**: Crie uma conta em [railway.app](https://railway.app)
2. **Git**: Tenha o projeto versionado no Git
3. **Banco de Dados**: O Railway automaticamente detectará que você usa PostgreSQL

## 🔧 Configuração do Deploy

### 1. Preparação do Projeto

O projeto já está configurado com:
- ✅ `railway.toml` - Configurações do Railway
- ✅ `nixpacks.toml` - Configurações de build
- ✅ Health check endpoint (`/api/health`)
- ✅ Scripts de build otimizados
- ✅ Configuração de CORS para produção

### 2. Deploy via GitHub

**Opção Recomendada**: Conectar repositório GitHub

1. Acesse [railway.app](https://railway.app)
2. Clique em "Start a New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte sua conta GitHub
5. Selecione o repositório `backend-clinica`
6. O Railway automaticamente detectará que é um projeto Node.js

### 3. Deploy via Railway CLI

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login

# Inicializar projeto
railway init

# Deploy
railway up
```

## 🔐 Configuração das Variáveis de Ambiente

No painel do Railway, configure estas variáveis:

### Obrigatórias:
```env
DATABASE_URL=postgresql://[fornecido automaticamente pelo Railway]
JWT_SECRET=seu-jwt-secret-super-seguro
NODE_ENV=production
```

### Para WhatsApp (se usar):
```env
META_WHATSAPP_TOKEN=seu-token
META_WHATSAPP_PHONE_ID=seu-phone-id
WHATSAPP_VERIFY_TOKEN=seu-verify-token
```

### Para OpenAI (se usar):
```env
OPENAI_API_KEY=sk-sua-chave-openai
CONTEXT_PROMPT=seu-prompt-do-chatbot
```

### Para Pinecone (se usar):
```env
PINECONE_API_KEY=sua-chave-pinecone
PINECONE_ENV=us-east-1
PINECONE_INDEX=nome-do-indice
```

## 🗄️ Banco de Dados

### Configuração Automática:
1. O Railway automaticamente criará um banco PostgreSQL
2. A variável `DATABASE_URL` será configurada automaticamente
3. As migrações do Prisma rodarão automaticamente no build

### Executar Seed (Opcional):
Se quiser popular o banco com dados iniciais:

```bash
# Via Railway CLI
railway run npm run seed

# Ou adicione ao script de build
# O comando já está configurado para rodar automaticamente
```

## 🌐 Configuração de Domínio

### Domínio Padrão:
- O Railway fornecerá um domínio: `https://seu-projeto.up.railway.app`

### Domínio Customizado:
1. No painel Railway, vá em "Settings" > "Domains"
2. Adicione seu domínio customizado
3. Configure o DNS conforme instruído

## 🔍 Verificação do Deploy

### Endpoints para Testar:
```bash
# Health Check
GET https://seu-dominio.up.railway.app/api/health

# API Docs (apenas desenvolvimento)
GET https://seu-dominio.up.railway.app/api/docs

# Endpoint principal
GET https://seu-dominio.up.railway.app/api
```

### Logs:
```bash
# Ver logs via CLI
railway logs

# Ou no painel web Railway
```

## 🚨 Troubleshooting

### Problemas Comuns:

1. **Build Failed**: Verifique se todas as dependências estão no `package.json`
2. **Database Connection**: Verifique se a `DATABASE_URL` está correta
3. **Port Issues**: O Railway usa a variável `PORT` automaticamente
4. **CORS Issues**: Adicione o domínio do Railway nas origens permitidas

### Verificar Status:
```bash
# Via CLI
railway status

# Health check
curl https://seu-dominio.up.railway.app/api/health
```

## 🔄 Deploy Automático

O Railway automaticamente fará redeploy quando:
- Você fizer push para a branch principal (main/master)
- As variáveis de ambiente forem alteradas

## 📊 Monitoramento

No painel Railway você pode:
- Ver métricas de CPU e memória
- Acompanhar logs em tempo real
- Configurar alertas
- Ver histórico de deploys

## 🛠️ Comandos Úteis

```bash
# Ver informações do projeto
railway status

# Ver logs
railway logs

# Conectar ao banco
railway connect

# Executar comandos
railway run [comando]

# Abrir no navegador
railway open
```

## 📱 Frontend

Lembre-se de atualizar a URL da API no seu frontend:
```typescript
// Desenvolvimento
const API_URL = 'http://localhost:3000/api'

// Produção
const API_URL = 'https://seu-dominio.up.railway.app/api'
```

---

🎉 **Pronto!** Sua API estará disponível 24/7 no Railway!