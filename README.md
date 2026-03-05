# 🦟 SISAV  
**Sistema de Informação em Saúde Antivetorial**

O **SISAV** é um sistema web **offline-first** desenvolvido para digitalizar e otimizar o registro diário de atividades de agentes de combate às endemias, substituindo planilhas manuais por uma solução moderna, confiável e fácil de usar.

Projetado para funcionar em **tablets e celulares**, o sistema garante produtividade mesmo em locais sem acesso à internet.

---

## 🎯 Objetivo

Facilitar o registro, controle e sincronização das atividades de campo relacionadas ao controle de vetores (como dengue, zika e chikungunya), oferecendo:

- Registro rápido e padronizado  
- Funcionamento offline  
- Redução de erros manuais  
- Dados consolidados automaticamente  

---

## 🚀 Funcionalidades

- 🔐 Autenticação de agentes com JWT  
- 🗓️ Criação de turno diário  
- 🏠 Registro de imóveis visitados  
- 📊 Resumo automático das atividades do dia  
- 📡 Funcionamento offline com sincronização online  
- 🔄 Integração com backend via API REST  
- 📱 Interface simples e responsiva (PWA)  

---

## 🔄 Fluxo do Sistema

1. Agente realiza login  
2. Cria um turno diário  
3. Registra os imóveis visitados  
4. Visualiza o resumo automático  
5. Finaliza o turno  
6. Dados são sincronizados com o servidor (quando houver internet)

---

## 🧠 Arquitetura Offline-First

- Dados salvos localmente usando IndexedDB  
- Trabalho totalmente offline em campo  
- Sincronização automática ao detectar conexão com a internet  

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5  
- CSS3  
- JavaScript (Vanilla)  
- IndexedDB  
- PWA (Progressive Web App)

### Backend
- Node.js  
- TypeScript  
- Express  
- Prisma ORM  
- PostgreSQL  
- JWT  

---


## 📦 Status do Projeto

🚧 Em desenvolvimento  

Funcionalidades futuras planejadas:
- Painel administrativo
- Relatórios gerenciais
- Exportação de dados
- Suporte multi-prefeitura

---

## 👨‍💻 Autor

**Guilherme Xavier**  
Desenvolvedor Web  

Projeto voltado para soluções digitais aplicadas à saúde pública.

---

## 📄 Licença

Este projeto está sob a licença MIT.  
Sinta-se à vontade para usar, modificar e contribuir.
