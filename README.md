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
├── argos-api/      # serviço de ordens de instalação (checklist + fotos) — ver argos-api/README.md
└── web/            # frontend React (fork traccar-web)
```

## Perfis de acesso (tipos de usuário)

Em **Configurações → Tipos de usuário** (só administradores) você define, página por página, se
o cliente a vê como **oculta**, **leitura** ou **editável**. Cada usuário recebe um tipo em
Configurações → Usuários, e ali também é possível **adicionar ou bloquear uma página só para
ele**, sem criar um tipo novo. Páginas ocultas também ficam bloqueadas quando a URL é digitada.

O catálogo fica em `server.attributes['argos.profiles']` e a atribuição em
`user.attributes['argos.profile']`, então **nada muda no backend Traccar**. Vale lembrar que
isso organiza a interface: o isolamento dos dados (cada cliente vê apenas os veículos
vinculados a ele) continua sendo garantido pelas permissões de dispositivo/grupo do Traccar, e
as flags nativas (`readonly`, `deviceReadonly`, `limitCommands`) continuam valendo em conjunto.

## Módulo do instalador

A página **Instalação** é o fluxo do técnico em campo: identifica o rastreador pelo IMEI
(digitado ou lido pela câmera), cadastra ou vincula o dispositivo e o cliente, registra os dados
do equipamento (carro, moto, barco, pet…), responde o checklist e anexa as fotos obrigatórias;
no fim confirma o recebimento de posição, testa o bloqueio e colhe a assinatura do cliente.
O administrador revisa em **Configurações → Ordens de instalação**, com galeria de fotos,
aprovar/reprovar e laudo imprimível.

As fotos e os checklists ficam no serviço `argos-api` (e não no Traccar, que só aceita uma
imagem de 500 KB por dispositivo). Para colocá-lo no ar, siga
[`argos-api/README.md`](argos-api/README.md) — resumidamente: um serviço novo no EasyPanel a
partir de `argos-api/Dockerfile`, um volume em `/data` e uma regra de proxy `/argos` no mesmo
domínio do app.

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
