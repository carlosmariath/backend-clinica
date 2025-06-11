#!/usr/bin/env node

/**
 * Script para verificar variáveis de ambiente
 */

require('dotenv').config();

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

const optionalVars = [
  'META_WHATSAPP_TOKEN',
  'META_WHATSAPP_PHONE_ID', 
  'WHATSAPP_VERIFY_TOKEN',
  'OPENAI_API_KEY',
  'CONTEXT_PROMPT',
  'PINECONE_API_KEY',
  'PINECONE_ENV',
  'PINECONE_INDEX',
  'PORT',
  'NODE_ENV'
];

console.log('🔍 Verificando variáveis de ambiente...\n');

// Verificar variáveis obrigatórias
let missingRequired = [];
console.log('📋 Variáveis OBRIGATÓRIAS:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? (value.length > 50 ? `${value.substring(0, 47)}...` : '***') : 'NÃO DEFINIDA';
  
  console.log(`  ${status} ${varName}: ${displayValue}`);
  
  if (!value) {
    missingRequired.push(varName);
  }
});

console.log('\n📋 Variáveis OPCIONAIS:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const displayValue = value ? (value.length > 50 ? `${value.substring(0, 47)}...` : '***') : 'NÃO DEFINIDA';
  
  console.log(`  ${status} ${varName}: ${displayValue}`);
});

console.log('\n📊 RESUMO:');
console.log(`  • Variáveis obrigatórias: ${requiredVars.length - missingRequired.length}/${requiredVars.length}`);
console.log(`  • Variáveis opcionais definidas: ${optionalVars.filter(v => process.env[v]).length}/${optionalVars.length}`);

if (missingRequired.length > 0) {
  console.log('\n❌ ERRO: Variáveis obrigatórias não encontradas:');
  missingRequired.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  console.log('\n💡 Dica: Verifique seu arquivo .env');
  process.exit(1);
} else {
  console.log('\n✅ Todas as variáveis obrigatórias estão configuradas!');
}

// Verificações específicas
console.log('\n🔍 Verificações específicas:');

// Database URL format
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    console.log('  ✅ DATABASE_URL tem formato válido');
  } else {
    console.log('  ⚠️ DATABASE_URL pode ter formato inválido');
  }
}

// JWT Secret length
if (process.env.JWT_SECRET) {
  const jwtLength = process.env.JWT_SECRET.length;
  if (jwtLength >= 32) {
    console.log('  ✅ JWT_SECRET tem tamanho adequado');
  } else {
    console.log('  ⚠️ JWT_SECRET muito curto (recomendado: 32+ caracteres)');
  }
}

// Context Prompt
if (process.env.CONTEXT_PROMPT) {
  const promptLength = process.env.CONTEXT_PROMPT.length;
  if (promptLength > 50) {
    console.log('  ✅ CONTEXT_PROMPT está definido');
  } else {
    console.log('  ⚠️ CONTEXT_PROMPT muito curto');
  }
}

console.log('\n🎉 Verificação concluída!');