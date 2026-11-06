# argos-api

Serviço de **ordens de instalação** do Argos Track: checklist assinado pelo instalador e as
**fotos** da instalação. Existe porque o Traccar oficial não serve para isso — o endpoint
`POST /api/devices/{id}/image` grava **uma única** imagem de 500 KB com nome fixo
(`device.<ext>`), e a coluna `attributes` é `VARCHAR(4000)`.

```
navegador ─► /api/...    Traccar oficial (inalterado)
          └► /argos/...  argos-api (este serviço)
```

## Decisões

- **Sem usuários próprios.** Toda requisição repassa o `JSESSIONID` (ou o `Authorization`) do
  chamador para `GET {TRACCAR_URL}/api/session`; a resposta é a identidade, com cache de 30 s.
  A visibilidade de um dispositivo é confirmada em `GET /api/devices?id=`. Assim o grafo de
  permissões do Traccar (usuário → grupo → dispositivo) nunca é reimplementado aqui.
- **Mesmo banco, prefixo `argos_`, nenhuma FK física para `tc_*`.** O Liquibase do Traccar
  altera/recria as tabelas `tc_*` nos upgrades da imagem oficial e uma FK externa abortaria a
  migração, travando o boot do servidor. As referências são lógicas e validadas na API.
- **Fotos no volume, caminho relativo no banco.** Layout
  `photos/<ano>/<mês>/<ordem>/<hash>_full.jpg` + `_thumb.jpg`. O caminho relativo permite
  migrar para S3/R2 trocando só quem resolve o caminho.
- **Laudo em HTML imprimível, não PDF no servidor.** Puppeteer custaria ~400 MB de imagem e
  ~300 MB de RAM por render; o navegador do usuário gera o PDF pelo "Imprimir" com o mesmo
  layout (`@page A4`).
- **Erros em texto puro**, porque o frontend usa `fetchOrThrow()`, que faz
  `new Error(await response.text())` e mostra a mensagem no snackbar. O handler final
  traduz antes de responder: o limite do multer vira `413 Imagem acima do limite de 8 MB`
  (e não um 500 com "File too large"), e erro de SQL vira uma mensagem genérica, com o
  detalhe só no log — quem está em campo não precisa ver a mensagem do driver MySQL.
- **O build verifica as dependências.** O `npm ci` do Dockerfile é seguido de um
  `node -e` que carrega express, mysql2, multer, exif-reader e sharp. O motivo é concreto: o
  npm 10 tem um modo de falha (`Exit handler never called!`) em que aborta a instalação no
  meio e **sai com código 0** — a imagem subia sem o express e entrava em crash-loop no
  deploy, com o build marcado como bem-sucedido. Agora quebra no build, que é onde deve.

## Variáveis de ambiente

| Variável | Obrigatória | Exemplo / padrão |
|---|---|---|
| `PORT` | não | `8090` |
| `ARGOS_BASE_PATH` | não | `/argos` |
| `TRACCAR_URL` | **sim** (na prática) | `http://rastreamento_traccar:8082` — rede interna, não o domínio público |
| `DB_HOST` | **sim** | `rastreamento_traccar_user` (o mesmo host do MySQL do Traccar) |
| `DB_PORT` | não | `3306` |
| `DB_NAME` | **sim** | `argos` (banco separado — veja abaixo) |
| `DB_USER` | **sim** | `argos` |
| `DB_PASSWORD` | **sim** | *(secret)* |
| `DB_POOL_LIMIT` | não | `8` |
| `STORAGE_DIR` | não | `/data/argos` |
| `MAX_UPLOAD_BYTES` | não | `8388608` (8 MB) |
| `MAX_PHOTOS_PER_ORDER` | não | `40` |
| `SESSION_CACHE_TTL_MS` | não | `30000` |
| `ALLOWED_ORIGINS` | recomendada | `https://seu-dominio` (vazio = não verifica, só para dev) |
| `RUN_MIGRATIONS` | não | `true` |

### Banco e usuário

As tabelas do argos-api ficam num **banco separado** (`argos`), não junto das `tc_*` do
Traccar. O serviço não precisa de nenhum acesso às tabelas do Traccar — identidade e
visibilidade de dispositivo são resolvidas pela API HTTP dele, nunca por SQL — então não
recebe esse acesso. Um bug aqui não alcança os dados do Traccar.

```sql
CREATE DATABASE IF NOT EXISTS argos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'argos'@'%' IDENTIFIED BY '<senha>';
GRANT ALL PRIVILEGES ON argos.* TO 'argos'@'%';
FLUSH PRIVILEGES;
```

Depois, `DB_NAME=argos` nas variáveis do serviço. O `docker compose` da raiz faz isso
automaticamente em `deploy/mysql-init.sh`.

> **Não tente restringir por prefixo de tabela.** Uma versão anterior deste documento
> sugeria `GRANT ALL PRIVILEGES ON traccar.`argos\_%``. Isso **não funciona**: o MySQL aceita
> curinga apenas no nome do *banco*, nunca no da tabela — o grant é gravado para uma tabela
> literalmente chamada `argos\_%` e o serviço não consegue nem criar o próprio schema
> (`CREATE command denied`). Banco separado é a forma que funciona.

### Nome e marca da interface (white-label)

A aba do navegador e o nome no PWA vêm de `server.attributes`, lidos pelo Traccar ao servir
o `index.html` e o `manifest.webmanifest` — não do código do frontend. Em
**Configurações → Servidor**, nos atributos, defina:

| Atributo | Efeito |
|---|---|
| `title` | Título da aba e `short_name` do PWA (padrão: `Traccar`) |
| `description` | `name` do PWA, usado no convite de instalação |
| `colorPrimary` | Cor do tema no manifest |
| `customHead` | HTML extra no `<head>` (ex.: script de analytics) |

Sem isso, o cliente instala um aplicativo chamado "Traccar" — detalhe que passa fácil e
destrói a percepção de produto próprio.

## Deploy no EasyPanel

**A ordem importa.** Faça o proxy antes de publicar o frontend novo: enquanto a regra `/argos`
não existir, a requisição cai no servidor web do Traccar e volta HTML. O app detecta isso e
mostra "módulo de instalação indisponível" em vez de um erro técnico, mas o módulo fica
inutilizável até o proxy existir.

1. **Banco**: crie o banco `argos` e o usuário dele (SQL na seção acima), no MySQL que o
   Traccar já usa.
2. **Novo serviço** `argos-api` apontando para este diretório (`argos-api/Dockerfile`).
3. **Volume** montado em `/data`. É aqui que ficam as fotos — **e é o que precisa de backup**:
   o laudo é prova de entrega do serviço e não pode ser recriado. O EasyPanel não versiona
   volumes.
4. **Variáveis** da tabela acima (`DB_HOST` é o host interno do MySQL; `DB_NAME=argos`).
5. **Proxy no mesmo domínio** (preferido): no serviço público, adicionar uma entrada de domínio
   com path `/argos` apontando para `argos-api:8090`. Isso mantém a requisição *same-origin*,
   o cookie de sessão do Traccar viaja sozinho e não há CORS.
   No proxy, garantir: `client_max_body_size` ≥ 12 MB (senão o upload de 8 MB morre em 413 antes
   de chegar aqui), `proxy_request_buffering off` e timeout de leitura ≥ 60 s.
   O arquivo [`deploy/nginx.conf`](../deploy/nginx.conf) é esse mesmo roteamento, pronto, caso
   você precise colocar um proxy próprio na frente.
6. **Confira a sonda**: `GET /argos/health` (público) retorna 200 só com banco e volume OK.
   Se vier 503, o corpo diz qual dos dois falhou.
7. **Só então** faça o redeploy do serviço do frontend/Traccar.
8. **Valide**: a bateria em [`test/`](test/README.md) exercita o fluxo inteiro (61 verificações,
   incluindo upload de foto e permissões) e pode ser apontada para o ambiente publicado.

Para ver a topologia inteira de pé numa máquina antes de publicar, há um
[`docker-compose.yml`](../docker-compose.yml) na raiz com as quatro peças e o proxy já
resolvido — foi com ele que este serviço foi validado.

Se a versão do EasyPanel não rotear por path entre serviços, as alternativas são um Caddy na
frente (`handle /argos* → argos-api:8090`, `handle → traccar:8082`) ou um host separado
(`argos.seu-dominio`) — nesse caso o cookie passa a ser cross-site e bloqueado pelo `SameSite`
padrão, então é obrigatório usar token: o frontend busca `GET /api/session/token` e manda
`Authorization: Bearer <token>`, configurando `VITE_ARGOS_API_URL` e `ALLOWED_ORIGINS`.

## Desenvolvimento local

```bash
cd argos-api
npm install
DB_HOST=127.0.0.1 DB_NAME=argos DB_USER=root DB_PASSWORD=root \
  TRACCAR_URL=https://seu-traccar STORAGE_DIR=/tmp/argos npm start
```

O `web/vite.config.js` já proxia `/argos` para `http://localhost:8090`.

Pegadinha: em dev o `JSESSIONID` vem do Traccar remoto através do proxy `/api`, então o
`TRACCAR_URL` daqui **precisa apontar para o mesmo Traccar** que o proxy usa, senão a sessão
não valida.

## Endpoints

| Método | Rota | Quem |
|---|---|---|
| GET | `/argos/health` | público |
| GET | `/argos/me` | sessão |
| GET | `/argos/templates?category=&active=` | sessão |
| GET | `/argos/templates/:id` | sessão |
| POST / PUT / DELETE | `/argos/templates[/:id]` | admin |
| GET | `/argos/orders` | escopo pelo papel (instalador vê as suas) |
| POST | `/argos/orders` | sessão — idempotente por `clientDraftId` |
| GET | `/argos/orders/:id` | dono, revisor ou quem vê o dispositivo |
| PUT | `/argos/orders/:id` | dono ou revisor, se a ordem estiver editável |
| PUT | `/argos/orders/:id/items` | idem (respostas do checklist, em lote) |
| POST | `/argos/orders/:id/status` | conforme a máquina de estados |
| POST | `/argos/orders/:id/photos` | multipart, 1 arquivo, ≤ 8 MB, `image/*` |
| GET | `/argos/photos/:id[/thumb]` | mesma permissão da ordem; ETag + 304 |
| DELETE | `/argos/photos/:id` | dono ou revisor, se a ordem estiver editável |
| GET | `/argos/orders/:id/report` | laudo HTML imprimível |
| GET | `/argos/admin/integrity` | admin/gestor |

Requisições que alteram dados exigem o cabeçalho `X-Argos-Client: web` (barra CSRF por
formulário de outro site) e, se `ALLOWED_ORIGINS` estiver definido, `Origin` na lista.

### Estados da ordem

```
rascunho ──► em_andamento ──► concluida ──► aprovada
                 ▲                │
                 └────────────────┴──► reprovada ──► em_andamento   (retrabalho)
rascunho|em_andamento ──► cancelada
```

Concluir exige: todos os itens obrigatórios respondidos (com observação quando o resultado é
`problem`), foto em todos os slots obrigatórios, dispositivo vinculado e posição recebida.
Aprovar/reprovar é só de admin/gestor, e reprovar exige comentário.

## Riscos conhecidos

- **Volume não é versionado pelo EasyPanel.** Fazer backup (`rclone sync /data/argos remote:`).
  `sha256` e `bytes` ficam no banco, então `GET /argos/admin/integrity` detecta divergência.
- **Crescimento**: ~7 fotos × ~300 KB ≈ 2 MB por ordem; 500 ordens/mês ≈ 1 GB/mês.
- **Dispositivo removido no Traccar**: a ordem sobrevive (`device_unique_id` desnormalizado).
  Fotos **nunca** são apagadas automaticamente — o laudo é prova de entrega.
- As tabelas `argos_*` entram no dump do MySQL de graça, desde que o backup não filtre tabelas.
