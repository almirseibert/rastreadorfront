# Argos Track

Sistema de rastreamento veicular/pessoal/de ativos. Frontend customizado (fork do
[traccar-web](https://github.com/traccar/traccar-web) 6.12.2 — React 19, Vite, MUI 7,
MapLibre GL) rodando sobre o backend **Traccar** padrão com MySQL, implantado no EasyPanel.

> Roadmap de melhorias e análise completa: **[MELHORIAS.md](MELHORIAS.md)**

## Estrutura

```
.
├── Dockerfile      # build multi-stage: compila o web/ e injeta no traccar/traccar:latest
├── traccar.xml     # config do backend (SEM segredos — senha via variável de ambiente)
└── web/            # frontend React (fork traccar-web)
```

## Desenvolvimento local

```bash
cd web
npm install --legacy-peer-deps
npm run dev        # porta 3000; /api e WebSocket são proxiados para o servidor (vite.config.js)
```

O proxy de desenvolvimento aponta para o servidor Traccar de produção (ver
`web/vite.config.js`). Faça login com um usuário real do sistema.

## Build e deploy (EasyPanel)

O `Dockerfile` compila o frontend e o injeta na imagem oficial `traccar/traccar:latest`,
substituindo a interface de fábrica.

**Importante — segredos:** o `traccar.xml` versionado não contém a senha do banco.
Ele habilita `config.useEnvironmentVariables`, então configure no serviço do EasyPanel
a variável de ambiente:

```
DATABASE_PASSWORD=<senha do MySQL>
```

Qualquer outra chave do Traccar também pode ser sobrescrita por env var
(chave em maiúsculas, pontos viram underscores — ex.: `DATABASE_URL`).

## Licença

Baseado no traccar-web, © Traccar (Anton Tananaev e colaboradores), licenciado sob a
Apache License 2.0. As modificações deste fork mantêm a mesma licença — ver
[web/LICENSE.txt](web/LICENSE.txt).
