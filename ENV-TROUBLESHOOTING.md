# 🔧 Resolução de Problemas com Variáveis de Ambiente

## ❌ Problema Identificado

Erro durante os testes no CI/CD:
```
error code: P1012
error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema.prisma:8
```

## ✅ Soluções Implementadas

### 1. **Centralização de Configuração**
- Criado `AppConfigService` em `src/config/config.service.ts`
- Validação automática de variáveis obrigatórias
- Fallbacks seguros para variáveis opcionais

### 2. **Validação no Startup**
- Verificação de variáveis obrigatórias no `main.ts`
- Logs informativos em desenvolvimento
- Exit graceful se configuração inválida

### 3. **Script de Verificação**
- `scripts/check-env.js` para validar ambiente local
- Comando `npm run check:env` para verificação rápida
- Comando `npm run dev:check` para verificar antes de iniciar

### 4. **Pipeline CI/CD Corrigida**
- Variáveis de ambiente configuradas em cada step dos testes
- Database de teste configurado com PostgreSQL
- Secrets organizados por ambiente (dev/prod)

## 🔑 Variáveis de Ambiente Necessárias

### **Obrigatórias** (aplicação não inicia sem elas):
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=super-secret-jwt-key-for-clinica-massages-and-therapies-2024
```

### **Opcionais** (têm fallbacks):
```bash
# WhatsApp
META_WHATSAPP_TOKEN=your-token
META_WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-verify-token

# OpenAI
OPENAI_API_KEY=sk-your-key
CONTEXT_PROMPT="Prompt do chatbot..."

# Pinecone
PINECONE_API_KEY=your-key
PINECONE_ENV=us-east-1
PINECONE_INDEX=clinica

# Sistema
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

## 🧪 Como Testar Localmente

### 1. Verificar Configuração:
```bash
npm run check:env
```

### 2. Iniciar com Verificação:
```bash
npm run dev:check
```

### 3. Build com Validação:
```bash
npm run build
```

## 🔍 Debugging

### Ver Logs de Configuração (Development):
```bash
NODE_ENV=development npm start
```

### Testar Prisma Especificamente:
```bash
npx prisma validate
npx prisma generate
```

### Verificar Database Connection:
```bash
npx prisma db pull
```

## 🚀 Configuração no GitHub Actions

As variáveis são configuradas em cada step:

```yaml
- name: Build application
  env:
    DATABASE_URL: postgresql://testuser:testpassword@localhost:5432/testdb
    JWT_SECRET: test-secret-key-for-ci-cd-pipeline-testing
  run: npm run build
```

## 🔒 Secrets no GitHub

Configure estes secrets no repositório:

### **Azure Infrastructure:**
- `AZURE_CREDENTIALS` - Service Principal JSON
- `AZURE_RESOURCE_GROUP` - Resource group name
- `AKS_CLUSTER_NAME` - AKS cluster name
- `ACR_LOGIN_SERVER` - Container registry URL
- `ACR_USERNAME` - Container registry username
- `ACR_PASSWORD` - Container registry password

### **Database URLs:**
- `DATABASE_URL_DEV` - Development database
- `DATABASE_URL_PROD` - Production database

### **Application Secrets:**
- `JWT_SECRET_DEV` - Development JWT secret
- `JWT_SECRET_PROD` - Production JWT secret
- `META_WHATSAPP_TOKEN` - WhatsApp API token
- `OPENAI_API_KEY` - OpenAI API key
- `CONTEXT_PROMPT` - Chatbot context prompt

### **Optional:**
- `SLACK_WEBHOOK` - For notifications

## 🎯 Benefícios da Solução

1. **Detecção Precoce**: Erros de configuração detectados no startup
2. **Debugging Fácil**: Logs claros sobre variáveis faltantes
3. **Ambiente Seguro**: Fallbacks previnem crashes
4. **CI/CD Robusto**: Testes passam com configuração correta
5. **Manutenção**: Script de verificação facilita debugging

## 📞 Suporte

Se ainda tiver problemas:

1. Execute `npm run check:env` primeiro
2. Verifique o arquivo `.env` existe e tem formato correto
3. Confirme que `DATABASE_URL` aponta para banco válido
4. Para CI/CD, verifique se todos os secrets estão configurados no GitHub