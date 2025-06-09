# 🚀 Pipeline Azure Kubernetes Service (AKS)

Esta documentação explica a configuração completa da pipeline automatizada para Azure Kubernetes Service com dois ambientes: **Development** e **Production**.

## 📋 Estrutura da Pipeline

### 🔄 **Workflows Principais**

| Workflow | Trigger | Descrição |
|----------|---------|-----------|
| `azure-k8s-ci-cd.yml` | Push, PR, Manual | Pipeline principal para AKS |
| `k8s-monitoring.yml` | Schedule, Manual | Monitoramento AKS |
| `pr-validation.yml` | Pull Requests | Validação de PRs |

## 🌍 **Ambientes Azure Kubernetes**

### 🔧 Development
- **Branch:** `develop`
- **Namespace:** `clinica-dev`
- **URL:** `https://api-dev.clinica.com`
- **Réplicas:** 1
- **Resources:** 256Mi RAM, 100m CPU

### 🌟 Production
- **Branch:** `main/master`
- **Namespace:** `clinica-prod`
- **URL:** `https://api.clinica.com`
- **Réplicas:** 3
- **Resources:** 512Mi RAM, 200m CPU

## 🏗️ **Infraestrutura Azure**

### Recursos Necessários:
```yaml
Resource Group: rg-clinica-k8s
AKS Cluster: aks-clinica-cluster
Container Registry: acrclinica.azurecr.io
Application Gateway: agw-clinica
KeyVault: kv-clinica-secrets
```

## 🔑 **Secrets Necessários no GitHub**

Configure em GitHub Settings > Secrets and variables > Actions:

### Azure Credentials
```bash
AZURE_CREDENTIALS='{
  "clientId": "xxx",
  "clientSecret": "xxx", 
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}'
```

### Azure Resources
```bash
AZURE_RESOURCE_GROUP=rg-clinica-k8s
AKS_CLUSTER_NAME=aks-clinica-cluster
ACR_NAME=acrclinica
ACR_LOGIN_SERVER=acrclinica.azurecr.io
ACR_USERNAME=acrclinica
ACR_PASSWORD=xxx
```

### Database URLs
```bash
DATABASE_URL_DEV=postgresql://...
DATABASE_URL_PROD=postgresql://...
```

### Application Secrets
```bash
JWT_SECRET_DEV=dev-jwt-secret
JWT_SECRET_PROD=prod-jwt-secret
META_WHATSAPP_TOKEN=xxx
META_WHATSAPP_PHONE_ID=xxx
WHATSAPP_VERIFY_TOKEN=xxx
OPENAI_API_KEY=sk-xxx
PINECONE_API_KEY=xxx
PINECONE_ENV=us-east-1
PINECONE_INDEX=clinica
```

### Notifications (Opcional)
```bash
SLACK_WEBHOOK=https://hooks.slack.com/...
```

## 🐳 **Estrutura Docker & Kubernetes**

### 📁 Estrutura de Arquivos:
```
├── Dockerfile                    # Multi-stage Docker build
├── k8s/
│   ├── base/                    # Manifests base
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   └── hpa.yaml
│   ├── dev/                     # Kustomization dev
│   │   ├── kustomization.yaml
│   │   └── *-patch.yaml
│   └── prod/                    # Kustomization prod
│       ├── kustomization.yaml
│       └── *-patch.yaml
└── helm/
    └── backend-clinica/         # Helm Chart
        ├── Chart.yaml
        ├── values.yaml
        ├── values-dev.yaml
        ├── values-prod.yaml
        └── templates/
```

## 🎯 **Fluxo de Deploy por Ambiente**

### 🔧 Development Flow
```mermaid
graph LR
    A[Push develop] --> B[CI Tests]
    B --> C[Build Image]
    C --> D[Push to ACR]
    D --> E[Update K8s]
    E --> F[Health Check]
    F --> G[Slack Notify]
```

### 🌟 Production Flow
```mermaid
graph LR
    A[Push main] --> B[Full CI/CD]
    B --> C[Security Scan]
    C --> D[Build Image]
    D --> E[Push to ACR]
    E --> F[Deploy to AKS]
    F --> G[Health Check]
    G --> H[Smoke Tests]
    H --> I[Create Release]
    I --> J[Slack Notify]
```

## 🚀 **Comandos de Deploy**

### Via GitHub Actions (Recomendado)
```bash
# Push para develop = Deploy automático DEV
git push origin develop

# Push para main = Deploy automático PROD  
git push origin main

# Deploy manual via workflow_dispatch
# GitHub > Actions > "Azure AKS CI/CD Pipeline" > Run workflow
```

### Via Kubectl (Manual)
```bash
# Conectar ao cluster
az aks get-credentials \
  --resource-group rg-clinica-k8s \
  --name aks-clinica-cluster

# Deploy dev
kustomize build k8s/dev | kubectl apply -f -

# Deploy prod  
kustomize build k8s/prod | kubectl apply -f -
```

### Via Helm (Alternativo)
```bash
# Install/Upgrade Dev
helm upgrade --install backend-clinica-dev ./helm/backend-clinica \
  --namespace clinica-dev \
  --values ./helm/backend-clinica/values-dev.yaml \
  --set image.tag=dev-123abc

# Install/Upgrade Prod
helm upgrade --install backend-clinica-prod ./helm/backend-clinica \
  --namespace clinica-prod \
  --values ./helm/backend-clinica/values-prod.yaml \
  --set image.tag=prod-456def
```

## 📊 **Monitoramento Automático**

### ⏰ Schedule Automático:
- **A cada hora:** Health checks de pods e services
- **Diário (9h UTC):** Relatório completo do cluster
- **Semanal:** Análise de recursos e performance

### 🔍 Health Checks:
- Pod readiness/liveness probes
- Service endpoint validation  
- Ingress DNS/SSL verification
- Application API health endpoints

### 📈 Métricas Monitoradas:
- CPU/Memory utilization
- Pod restart count
- HPA scaling events
- Network traffic
- Error rates

## 🛠️ **Comandos Úteis**

### Verificar Status
```bash
# Pods por ambiente
kubectl get pods -n clinica-dev
kubectl get pods -n clinica-prod

# Services e endpoints
kubectl get svc,endpoints -n clinica-dev
kubectl get svc,endpoints -n clinica-prod

# HPA status
kubectl get hpa -n clinica-dev
kubectl get hpa -n clinica-prod

# Logs da aplicação
kubectl logs -f deployment/dev-backend-clinica -n clinica-dev
kubectl logs -f deployment/prod-backend-clinica -n clinica-prod
```

### Port Forward para Teste Local
```bash
# Dev environment
kubectl port-forward svc/dev-backend-clinica-service 8080:80 -n clinica-dev

# Prod environment  
kubectl port-forward svc/prod-backend-clinica-service 8080:80 -n clinica-prod

# Testar: curl http://localhost:8080/api/health
```

### Scaling Manual
```bash
# Scale dev
kubectl scale deployment dev-backend-clinica --replicas=2 -n clinica-dev

# Scale prod
kubectl scale deployment prod-backend-clinica --replicas=5 -n clinica-prod
```

## 🔒 **Segurança**

### 🛡️ Configurações de Segurança:
- **Non-root containers** (UID 1001)
- **Read-only root filesystem**
- **Security contexts** restritivos
- **Network policies** (opcional)
- **Pod Security Standards**

### 🔍 Security Scans:
- **Trivy:** Scan de vulnerabilidades em imagens
- **Kubesec:** Análise de segurança dos manifests
- **Snyk:** Scan de dependências Node.js

### 🔐 Secrets Management:
- Secrets do Kubernetes para dados sensíveis
- Azure KeyVault integration (recomendado)
- Rotação automática de secrets

## 🚨 **Troubleshooting**

### ❌ Deploy Falha
```bash
# 1. Verificar status dos pods
kubectl get pods -n clinica-{dev|prod}

# 2. Ver logs de erro
kubectl logs deployment/{dev|prod}-backend-clinica -n clinica-{dev|prod}

# 3. Verificar eventos
kubectl get events -n clinica-{dev|prod} --sort-by='.lastTimestamp'

# 4. Verificar recursos
kubectl describe pod <pod-name> -n clinica-{dev|prod}
```

### 🔍 Database Connection Issues
```bash
# 1. Verificar secrets
kubectl get secret {dev|prod}-backend-clinica-secrets -n clinica-{dev|prod} -o yaml

# 2. Testar conectividade do banco
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n clinica-{dev|prod} \
  -- psql postgresql://user:pass@host:5432/db

# 3. Verificar DNS
kubectl run -it --rm debug --image=busybox --restart=Never -n clinica-{dev|prod} \
  -- nslookup postgres-service
```

### 🌐 Ingress Issues
```bash
# 1. Verificar ingress
kubectl get ingress -n clinica-{dev|prod}

# 2. Verificar Application Gateway
az network application-gateway show \
  --resource-group rg-clinica-k8s \
  --name agw-clinica

# 3. Testar DNS
nslookup api-dev.clinica.com
nslookup api.clinica.com
```

## 📞 **Suporte e Contatos**

### 🆘 Em caso de problemas:
1. **GitHub Issues:** Para bugs da pipeline
2. **Slack #devops:** Para dúvidas gerais  
3. **Azure Support:** Para problemas de infraestrutura
4. **Emergency:** Contato direto do time DevOps

### 📚 **Documentação Adicional:**
- [Azure AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

---

🎉 **Pipeline AKS Configurada!** Sua aplicação agora roda em Azure Kubernetes Service com alta disponibilidade e auto-scaling!