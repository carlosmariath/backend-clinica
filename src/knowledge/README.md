# Sistema de Base de Conhecimento

Esta é uma implementação avançada para a base de conhecimento do sistema de atendimento da clínica. O sistema permite que administradores gerenciem o conteúdo da base de conhecimento, categorizem informações e detectem automaticamente perguntas frequentes que precisam ser adicionadas.

## Funcionalidades

### 1. Gestão de Conteúdo Categorizado

- **Categorias de Conhecimento**: Organização do conteúdo em diferentes categorias para melhor gestão.
- **Etiquetas (Tags)**: Possibilidade de adicionar etiquetas para facilitar a busca e organização.
- **Habilitação/Desabilitação**: Controle sobre quais entradas estão ativas no sistema.
- **Rastreamento de Uso**: Contagem de visualizações para identificar conteúdo mais importante.

### 2. Detecção Automática de Perguntas Frequentes

- **Análise de Similaridade**: O sistema detecta quando perguntas similares são feitas repetidamente.
- **Agregação de Frequência**: Contagem de ocorrências para identificar as perguntas mais comuns.
- **Painel de Sugestões**: Interface para administradores revisarem perguntas frequentes e adicioná-las à base.

### 3. Sistema de Busca por Embeddings

- **Embeddings de OpenAI**: Vetorização semântica do texto para busca por similaridade.
- **Armazenamento em Pinecone**: Vetor database para busca rápida por similaridade.
- **Limiar de Confiança**: Configuração do nível de similaridade necessário para retornar respostas.

## Arquitetura

### Modelos de Dados

- **KnowledgeBase**: Entradas da base de conhecimento com pergunta, resposta e metadados.
- **KnowledgeCategory**: Categorias para organização do conhecimento.
- **FrequentQuestion**: Registro de perguntas frequentes e quantas vezes foram feitas.

### Fluxo de Processamento

1. Quando um usuário faz uma pergunta via WhatsApp, o sistema busca na base de conhecimento.
2. Se uma resposta é encontrada com confiança alta, é retornada após reformulação com IA.
3. Toda pergunta é registrada e analisada para verificar se é similar a outras já feitas.
4. Perguntas frequentes sem resposta são destacadas para os administradores.

## Endpoints da API

### Gerenciamento de Conteúdo

- `GET /knowledge`: Lista todas as entradas (com filtros).
- `POST /knowledge`: Adiciona uma nova entrada.
- `PUT /knowledge/:id`: Atualiza uma entrada existente.
- `DELETE /knowledge/:id`: Remove uma entrada.

### Categorias

- `GET /knowledge/categories`: Lista todas as categorias.
- `POST /knowledge/categories`: Cria uma nova categoria.
- `PUT /knowledge/categories/:id`: Atualiza uma categoria.
- `DELETE /knowledge/categories/:id`: Remove uma categoria.

### Perguntas Frequentes

- `GET /knowledge/frequent-questions`: Lista perguntas frequentes.
- `POST /knowledge/frequent-questions/:id/convert`: Converte uma pergunta frequente em entrada da base de conhecimento.

### Busca Pública

- `POST /knowledge/search`: Ponto de acesso para busca na base de conhecimento.

## Segurança e Acesso

Todos os endpoints de administração estão protegidos por autenticação JWT e restritos a usuários com papel ADMIN. O único endpoint público é o `/knowledge/search`, utilizado pelo serviço de WhatsApp para buscar respostas.

## Exemplos de Uso

### Adicionar Conteúdo à Base de Conhecimento

```json
// POST /knowledge
{
  "question": "Quais são os horários de funcionamento da clínica?",
  "answer": "Nossa clínica funciona de segunda a sexta, das 8h às 20h, e aos sábados das 8h às 12h.",
  "categoryId": "e3b7f1c5-8a3d-4b2e-9e1f-7c9d2a6b4e5c",
  "tags": ["horários", "funcionamento", "atendimento"]
}
```

### Criar uma Categoria

```json
// POST /knowledge/categories
{
  "name": "Informações Gerais",
  "description": "Informações básicas sobre a clínica e serviços"
}
```

### Converter Pergunta Frequente

```json
// POST /knowledge/frequent-questions/f9c2e8b7-1d4a-5e6f-9a8b-7c6d5e4f3a2b/convert
{
  "answer": "Aceitamos pagamentos via PIX, cartão de crédito e débito, e dinheiro.",
  "categoryId": "e3b7f1c5-8a3d-4b2e-9e1f-7c9d2a6b4e5c"
}
``` 