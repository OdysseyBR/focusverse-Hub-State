# Focusverse Hub

Fusão do **Focusverse Timeline/Hub** (site 1) com o **Universe Wiki** (site 2) em um único projeto unificado, com novo design e painel de personalização para administradores.

## Estrutura

```
focusverse-hub/
├── server.js          # Backend Express (autenticação, Cloudinary sign, API do mapa)
├── client/            # Frontend React + Vite
│   └── src/
│       ├── pages/     # Páginas do Hub (Timeline, Personagens, Mapa, etc.)
│       │   └── wiki/  # Páginas do Wiki
│       ├── components/ # Componentes compartilhados
│       │   ├── Sidebar.jsx    # Sidebar unificada
│       │   └── AdminPanel.jsx # Painel de personalização
│       ├── contexts/
│       │   ├── AuthContext.jsx  # Firebase Auth
│       │   └── ThemeContext.jsx # Tema dinâmico (salvo no Firestore)
│       └── lib/
│           └── db.js  # Funções Firestore (Wiki)
└── firestore.rules    # Regras de segurança
```

## Setup

1. Copie `.env.example` para `.env` e preencha com as credenciais do **projeto 1 (focus-tl)**
2. Copie `client/.env.example` para `client/.env` e preencha
3. No `firestore.rules`, substitua `SEU_EMAIL_ADMIN_AQUI` pelo seu email

```bash
# Instalar e rodar
npm install
npm run build    # faz build do client
npm start        # inicia o servidor
```

## Personalização (Admin)

Na sidebar, clique em **"Personalizar"** (visível só para admin). O painel permite:

- **Marca**: logo (upload), nome do site, subtítulo, largura da sidebar
- **Cores**: paletas prontas + cores personalizadas por CSS var
- **Tipografia**: 6 famílias de fontes disponíveis

Tudo é salvo no Firestore (`config/theme`) e aplicado em tempo real para todos os usuários.

## Credenciais

- Firebase: projeto **focus-tl** (site 1)
- Cloudinary: credenciais do site 1
- Não há conflito com o universe-wiki — o projeto foi migrado inteiramente para o Firebase do site 1
