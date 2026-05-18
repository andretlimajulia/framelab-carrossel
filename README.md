# FrameLab Desktop — Servidor Local

## Instalação

```bash
cd framelab-server
npm install
```

## Rodar

```bash
npm start
```

Acesse: **http://localhost:3001**

## Estrutura

```
framelab-server/
├── server.js          ← servidor Express
├── package.json
├── public/
│   └── index.html     ← cole aqui o framelab-desktop.html renomeado
└── data/
    └── templates.json ← criado automaticamente ao salvar o primeiro template
```

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/health | Verifica se o servidor está rodando |
| GET | /api/templates | Lista todos os templates (metadados) |
| GET | /api/templates/:id | Retorna um template completo |
| POST | /api/templates | Salva um template (cria ou atualiza) |
| DELETE | /api/templates/:id | Remove um template |

## Deploy em produção

1. Suba os arquivos para o servidor (VPS, Railway, Render, etc.)
2. No `framelab-desktop.html`, mude a linha:
   ```js
   const API_BASE = 'http://localhost:3001';
   ```
   para a URL do seu servidor:
   ```js
   const API_BASE = 'https://meuservidor.com';
   ```
3. Rode `npm start` no servidor

## Como usar

1. Mova o `framelab-desktop.html` para a pasta `public/` com o nome `index.html`
2. Rode `npm start`
3. Acesse http://localhost:3001 no navegador
4. Importe um JSON do Figma → dê um nome → salva automaticamente
5. Todos que acessarem o mesmo servidor verão os mesmos templates
