# Argos Track — Análise e Roadmap de Melhorias

> Documento vivo. Atualize a cada ciclo de trabalho.
> Última atualização: 2026-07-26

## 1. Estado atual

| Item | Situação |
|---|---|
| Frontend | Fork do [traccar-web](https://github.com/traccar/traccar-web) **6.12.2** — React 19, Vite 7, MUI 7, MapLibre GL 5, Redux Toolkit, PWA |
| Backend | Imagem oficial `traccar/traccar:latest` (Docker multi-stage no `Dockerfile`) |
| Banco | MySQL no EasyPanel (schema padrão do Traccar) |
| Deploy | EasyPanel — build a partir deste repositório |
| Marca | "Argos Track" (visual originalmente copiado de referência "SigaSul") |
| Decisão de arquitetura | **Backend permanece Traccar** (sem migração para flespi/Gurtam) |

A referência de produto/UX é o **Ruhavik** (Gurtam / GPS-Trace): interface limpa,
cards de unidades com status, viagens (trips) com cards e playback, timeline de eventos
do dia, geofences com notificações, compartilhamento de localização e comandos remotos.

## 2. Feito neste ciclo (2026-07-19)

### Higiene e segurança
- [x] `.gitignore` na raiz (node_modules, build, logs, env locais).
- [x] **Senha do MySQL removida do `traccar.xml`** — agora `config.useEnvironmentVariables=true`;
      a senha entra pela env var `DATABASE_PASSWORD` no serviço do EasyPanel.
- [x] `README.md` próprio na raiz (como rodar, buildar, deploy, licença).
- [ ] **PENDENTE (ação manual): rotacionar a senha do MySQL** — a senha antiga
      (`Miguel@…`) está no histórico do git e o repositório tem remote público no GitHub.
      Trocar a senha no MySQL/EasyPanel e configurar a env var. Opcional: recriar o repo
      para limpar o histórico.

### Tema centralizado (correção do dark mode)
- [x] Tokens da marca em `web/src/common/theme/palette.js`: `sidebar.*` (fundo, header,
      borda, hover, textos), `motion.moving/stopped`, `background.paper/default` com
      variantes dark corretas.
- [x] Removida a referência fantasma `theme.palette.customColors` (nunca existiu).
- [x] `MuiOutlinedInput` global: borderRadius 8, fundo `background.paper` (fim dos campos
      pretos arredondados do login).
- [x] Varredura completa: nenhuma cor hex hardcoded restante nos `.jsx`
      (BottomMenu, MainPage, DeviceRow, MainToolbar, MotionBar, Login/Register/Reset/ChangeServer).
- [x] Novos tokens `dimensions.navSidebarWidth` (240px) e `dimensions.deviceRowHeight` (116).

### UX/UI estilo Ruhavik
- [x] **Sidebar refatorada**: novo `AppSidebar.jsx` (desktop) + `useNavigation.js` (hook
      compartilhado); `BottomMenu.jsx` agora é só o menu inferior mobile. Strings PT
      hardcoded migradas para i18n (`mapTitle`, `deviceTitle`, `reportTitle`, etc.).
- [x] **Cards de dispositivos** (`DeviceRow`): avatar circular colorido por status
      (verde=movendo, azul=online, vermelho=offline, cinza=desconhecido), chip de status
      com tooltip de tempo relativo, visual de card com borda/raio, Switch decorativo removido.
- [x] **Toolbar**: chips de filtro rápido "Todos / Online / Offline" com contadores.
- [x] **StatusCard**: header com avatar+nome+chip de status; botão de compartilhamento
      visível; no mobile vira bottom sheet ancorado acima do menu.
- [x] **Login/Registro/Reset/Trocar servidor**: card claro (paper) com dark mode automático,
      campos outlined padrão, botão primário contained fullWidth.

## 2.1 Reconhecimento da plataforma Ruhavik (feito em 2026-07-19, conta real)

Navegação autenticada em `ruhavik.gurtam.space` (unidade "My Coban GPS303-G"). Estrutura mapeada:

**Abas do workspace** (barra de navegação): Units · Trips · Subscriptions · Notifications ·
Geofences · Statistics · Maintenance · Timeline.

**Card da unidade (Units)**: nome + hora da última atualização, endereço geocodificado,
tempo parado (ex.: "02:26"), hodômetro ("mil.count. A: 2.842 km"), velocidade, e uma
barra de ações rápidas: status detalhado, painel de comandos, trips, última mensagem,
direção, **Arm/Disarm**, **Block/Unblock**, **modo segurança**, seguir no mapa, menu de
compartilhamento, histórico. Os botões de ação são ordenáveis ("Sort buttons").

**Status detalhado**: online/offline, satélites, primeira/última mensagem, tarifa,
armazenamento de mensagens, retenção. Abas internas da unidade: History · Events ·
Trips · Sharing · Tools · Settings.

**Trips**: fita de datas ("Today", "Yesterday", ~30 dias) + cards por viagem/estacionamento
com hora, endereço, duração ("Duration: 02:28:12", "End of parking"). Trip desenhada no mapa
ao selecionar.

**Timeline**: mesma fita de datas; lista cronológica de eventos do dia — **recurso pago**
no Ruhavik (oportunidade: oferecer grátis no Argos Track como diferencial).

**Notifications**: feed por dia ("X started the trip 13:02", "X ended the trip 13:06").
Configuração em Simple/Customizable/Parameter; tipos: Alarmes (reboque/towing),
Trips (início/fim), Geofences (entrada/saída); "Send methods" (push/email/etc.) é premium.

**Geofences**: lista com "New geofence", perímetro e área calculados.

**Statistics**: Mileage summary, Engine hours (premium), Export events (premium),
Charts por dado do dispositivo; contadores de uso do plano (Units 1/1, Geofences 0/1).

**Maintenance**: contadores de quilometragem e horas de motor (config + resumo).

**Sharing**: endereço atual copiável + links de compartilhamento criáveis (premium).

**User Menu**: Announcements, Map type, Sessions, User Settings, Notification Settings,
Appearance settings, About, Logout.

**Decisão Argos Track**: sem paywall — todas as funcionalidades (Timeline, Sharing,
horas de motor, export, notificações) ficam acessíveis a todos os usuários, respeitando
apenas o modelo de permissões abaixo.

## 2.2 Modelo de acesso (master × empresas × usuários)

Requisito confirmado em 2026-07-19 e **já suportado nativamente** pelo Traccar + telas do fork:

| Papel | Como configurar | O que enxerga |
|---|---|---|
| **Master** | Usuário com flag `administrator` (Configurações → Usuários → editar → Administrador) | Tudo: todos os usuários, todos os rastreadores, config do servidor, logs, auditoria |
| **Empresa (gestor)** | Usuário com `userLimit > 0` (pode criar sub-usuários) e `deviceLimit` opcional | Seus rastreadores vinculados + os sub-usuários que criar |
| **Usuário normal** | Usuário comum, sem flags | Somente os rastreadores que o admin/gestor vincular a ele |

**Vinculação** (ex.: Empresa A → rastreadores 1, 2, 3):
1. Master cria o usuário "Empresa A" em Configurações → Usuários.
2. Na lista de usuários → ícone de conexões do usuário → marca os dispositivos 1, 2 e 3
   (tela `UserConnectionsPage`; o inverso existe em `DeviceConnectionsPage`).
3. Alternativa em escala: criar um **Grupo** "Empresa A", pôr os dispositivos no grupo e
   vincular o grupo ao usuário (`GroupConnectionsPage`) — novos rastreadores do grupo já
   nascem visíveis para a empresa.
4. Empresa B idem com os rastreadores 4, 5 e 6. Cada login vê apenas os seus.

O frontend já respeita isso automaticamente (a API `/api/devices` só devolve o que o
usuário logado pode ver; hooks `useAdministrator`/`useManager`/`useRestriction`).

**Melhorias de UX planejadas para esse fluxo** (backlog):
- Assistente "Nova empresa" que cria usuário-gestor + grupo + vinculações em um passo só.
- Coluna "Empresa/Grupo" e filtro por grupo na lista de dispositivos do admin.
- Tela de visão geral para o master: contagem de dispositivos por empresa, últimos online.

## 2.3 Redesign de navegação estilo SigaSul (2026-07-26)

Referência visual: screenshots reais do SigaSul (trilho de ícones à esquerda sempre visível).
- [x] **Trilho de ícones** (`AppSidebar.jsx`): o menu escuro de 240px virou um trilho fino de
      84px (`dimensions.navSidebarWidth`) com ícone + rótulo curto e item ativo destacado
      (borda + cor primária); resolve as "duas colunas" da tela inicial.
- [x] **Monograma compacto** (`LogoMark.jsx`): quadrado branco com "A" + "ARGOS" no topo do
      trilho (o logo SVG completo tem 280KB, ilegível em miniatura); respeita
      `server.attributes.logo` (white-label) quando existir.
- [x] **Lista de veículos flutuante** (`MainPage.jsx`): no desktop o mapa ocupa toda a área à
      direita do trilho e a lista virou um painel flutuante arredondado com sombra, retrátil
      pelo botão da toolbar; `MapPadding` recalculado (trilho + painel). Mobile inalterado.
- [x] **Botão "Sair" reduzido** a um ícone pequeno no rodapé do trilho (era botão vermelho
      de largura total).
- [x] **Trilho global no `PageLayout`**: Configurações/Relatórios agora mostram o mesmo trilho
      à esquerda (paper do Drawer MUI é `position:fixed`, então o `left` do painel de seção é
      compensado pela largura do trilho). Padrão de navegação unificado em todas as telas.
- [x] **Barra de topo horizontal** (`MainTopBar.jsx`, desktop): à direita do trilho, com
      navegação de "views" (Mapa · Painel · Viagens · Linha do Tempo · Relatórios, item ativo
      destacado) e, à direita, o menu do usuário (conta/sair). Altura em
      `dimensions.topBarHeight` (52px); `MapPadding` ganhou parâmetro `top` para empurrar os
      controles do mapa (zoom/troca de estilo) abaixo da barra; painel flutuante desce junto.
- [x] **Seletor de empresa/grupo** no topo (visível a admin/gestor com grupos): dropdown que
      filtra toda a frota por grupo; "Todos os dispositivos" limpa o filtro. Equivalente ao
      seletor de cliente do SigaSul.
- [x] **Grupo persistido e global** (`usePersistedState('selectedGroupId')`): a empresa
      escolhida é salva no localStorage e vale entre sessões e entre páginas. `useFilter`
      passou a receber `selectedGroup`; util `common/util/deviceGroups.js` centraliza o filtro
      por hierarquia de grupos.
- [x] **Barra de topo em todas as páginas de view** via novo `ViewLayout.jsx` (trilho + barra
      de topo no desktop; AppBar + menu inferior no mobile): aplicado a Painel, Viagens, Linha
      do Tempo e Geofences (cabeçalhos "voltar+título" redundantes removidos). Nessas páginas o
      seletor de empresa filtra os dispositivos disponíveis (dropdown/agregação), e o device
      selecionado é resetado se sair do grupo.
- [x] **Chrome global único em `App.jsx`** (2026-07-26): o trilho (`AppSidebar`) + a barra de
      topo (`MainTopBar`) passaram a ser renderizados **uma única vez** em `App.jsx` (desktop),
      envolvendo o `<Outlet>`. Eliminou a duplicação entre `MainPage` e `ViewLayout` e passou a
      **cobrir também Configurações/Relatórios** com a barra de topo.
  - `App.jsx` é dono do `selectedGroup` (`usePersistedState`) e o distribui via
    `Outlet context`; as páginas consomem por `useOutletContext()` (fim das cópias locais de
    `usePersistedState('selectedGroupId')` em Main/Dashboard/Trips/Timeline/Geofences).
  - `ViewLayout` virou wrapper **só-mobile** (AppBar voltar+título); no desktop é passthrough.
  - `PageLayout` deixou de renderizar o próprio trilho e trocou o `Drawer` fixo do desktop por
    um painel flex, encaixado abaixo da barra de topo global (sem mais compensação de `left`).
  - `MainPage`/`MainMap`: painel flutuante agora é `position:absolute` na área de conteúdo e o
    `MapPadding` perdeu os offsets de trilho/topbar (já fora da área do mapa). Rodapé mobile
    duplicado (`BottomMenu`) removido — o menu inferior é único, vindo do `App`.
  - Rotas de detalhe (`/replay`, `/position`, `/network`, `/event`, `/emulator`) ficam **sem**
    o chrome (tela cheia própria), via lista `bareLayoutPaths` em `App.jsx`.

## 2.4 Frentes 1–3 (2026-07-26)

### Frente 1 — Master × empresas
- [x] **Assistente "Nova empresa"** (`web/src/settings/components/CompanyWizard.jsx`): num único
      passo cria o gestor (`POST /api/users` com `userLimit:-1`), cria o grupo/empresa
      (`POST /api/groups`), move os dispositivos escolhidos para o grupo
      (`PUT /api/devices/:id` com `groupId`) e liga o grupo ao gestor
      (`POST /api/permissions {userId, groupId}`). Atualiza a store (`groupsActions.refresh` +
      `devicesActions.update`) para refletir sem recarregar.
- [x] **Visão geral do master** (`web/src/settings/CompaniesPage.jsx`, rota `/settings/companies`,
      item "Empresas" no `SettingsMenu` só para admin): uma linha por empresa com contagem de
      dispositivos, online/offline (chips) e última atualização; ações editar/remover/conexões.
      Linha "Sem grupo" agrega dispositivos ainda não vinculados.
- [x] Coluna "Empresa/Grupo" na lista de dispositivos já existia (`DevicesPage`, `groupParent`);
      filtro por grupo já disponível pelo seletor da barra de topo global.
- [x] **Assistente de sub-usuário** (`web/src/settings/components/SubUserWizard.jsx`, ação por
      empresa na `CompaniesPage`): cria um usuário comum (sem admin/`userLimit`) e concede acesso
      só ao subconjunto escolhido — a empresa inteira (grupo) **ou** dispositivos específicos dela
      (`POST /api/permissions` com `groupId`/`deviceId`). Best-effort: vincula o sub-usuário ao(s)
      gestor(es) da empresa (`GET /api/users?groupId=` → `managedUserId`), tolerante a falha.

### Frente 2 — Refinamentos das fases
- [x] **Arm/Disarm no `QuickCommands`**: novos atalhos `alarmArm` (escudo, âmbar) e `alarmDisarm`
      (escudo removido, azul), ambos com confirmação; aparecem só quando o dispositivo tem saved
      command do tipo ou o protocolo suporta (mesma lógica de disponibilidade dos demais).
- [x] **Consumo (`spentFuel`) no card de Viagens** (`TripsPage`): mostra o combustível gasto por
      viagem quando a API retorna (`> 0`), respeitando `volumeUnit` do usuário (`formatVolume`).
- [x] **Compartilhamentos ativos com revogação** (`SharePage`): lista os usuários temporários com
      acesso ao dispositivo (`GET /api/users?deviceId=`), com validade e botão de revogar
      (`DELETE /api/users/:id`). Recarrega após criar/revogar.
- [x] **Timeline → ponto no mapa** (`TimelinePage` redesenhada em lista + mapa, estilo Viagens):
      cada entrada com coordenada fica clicável e mostra o ponto no mapa (marcador + câmera).
      Trips/paradas usam suas próprias coordenadas; eventos só trazem `positionId`, então as
      posições são buscadas em lote (`GET /api/positions?id=...`). Marcadores por tipo
      (`start-success` viagem, `default-neutral` parada, `default-info` evento).

### Frente 3 — Higiene e testes
- [x] **Smoke test Playwright** (`web/tests/smoke.spec.js` + `web/playwright.config.js`): teste
      base (app sobe e mostra o login, seletores por tipo/estrutura, sem depender de idioma) e um
      caminho autenticado (login + canvas do mapa) que só roda com `E2E_EMAIL`/`E2E_PASSWORD`.
      Scripts `test:e2e`/`test:e2e:ui`; requer `npm install` + `npx playwright install`.
      `eslint.config.js` ganhou override com globals de Node para `tests/**` e `playwright.config.js`.
- [x] Revisão de Configurações/Relatórios após a troca do `PageLayout`: a área de conteúdo ficou
      equivalente à anterior (mesmo `content` flex/scroll); painel de seção virou `div` flex.
      Build de produção validado (2278 módulos, sem erros).

## 3. Roadmap (próximas fases)

### Fase B — Trips estilo Ruhavik ✅ (feita em 2026-07-19)
Página `/trips` (`web/src/other/TripsPage.jsx`), acessível pela sidebar ("Viagens") e
pelo menu inferior mobile:
- [x] Seletor de dispositivo + fita de datas (Hoje/Ontem/30 dias).
- [x] Cards de viagens (`/api/reports/trips`) mesclados cronologicamente com paradas
      (`/api/reports/stops`): horário início→fim, km, duração, vel. média/máx, endereços.
- [x] Card selecionado desenha a rota no mapa (`/api/reports/route` + marcadores início/fim).
- [x] Botão ▶ em cada viagem abre o playback (`/replay` com from/to/deviceId).
- [x] Resumo do dia (nº de viagens, km total, tempo total).
- [ ] Refinamento futuro: consumo estimado no card e atalho "Viagens" no StatusCard.

### Fase C — Timeline do dia ✅ (feita em 2026-07-19)
Página `/timeline` (`web/src/other/TimelinePage.jsx`), item "Linha do Tempo" na sidebar:
- [x] Seletor de dispositivo + fita de datas (componente compartilhado
      `common/components/DateStrip.jsx`, também usado na página de Viagens).
- [x] Lista cronológica vertical (estilo linha do tempo com conector) mesclando
      eventos (`/api/reports/events`, títulos via `formatNotificationTitle`),
      viagens e paradas do dia.
- [x] Ícones por tipo: velocidade, geofence, ignição, online/offline, alarme, viagem, parada.
- [ ] Refinamento futuro: clicar num evento com posição mostra o ponto no mapa;
      entrada no menu mobile; i18n do rótulo "Linha do Tempo".

### Fase D — Compartilhamento como recurso de 1ª classe ✅ (feita em 2026-07-19)
`settings/SharePage.jsx` redesenhada (acessível pelo botão de compartilhar no StatusCard):
- [x] Presets de validade em chips (1 hora, 1 dia, 1 semana, 1 mês) + data customizada.
- [x] Link gerado via `/api/devices/share` com botão de copiar (feedback "Link copiado").
- [x] QR code inline do link (react-qr-code, fundo claro para leitura).
- [x] Compartilhar via WhatsApp (wa.me com mensagem pronta) e via share nativo do
      celular (navigator.share, aparece só quando suportado).
- [ ] Refinamento futuro: lista de links ativos com revogação (o Traccar expõe tokens
      temporários por usuário; exigiria gerenciar os usuários temporários criados).

### Fase E — Comandos rápidos ✅ (feita em 2026-07-20)
Novo componente `web/src/common/components/QuickCommands.jsx`, renderizado no StatusCard
(linha própria acima das ações, com divisor):
- [x] Atalhos: **bloquear motor** (cadeado, vermelho), **desbloquear motor** (cadeado
      aberto, verde) e **pedir posição** (mira, azul).
- [x] Disponibilidade por dispositivo: um atalho só aparece se existir um saved command
      daquele tipo (`/api/commands/send?deviceId=`) ou se o protocolo suportar o tipo
      (`/api/commands/types?deviceId=`, oculto para usuários com `limitCommands`).
      Saved command tem prioridade (preserva atributos específicos do rastreador).
- [x] Confirmação em dialog antes dos comandos críticos (bloqueio/desbloqueio), com nome
      do comando + dispositivo; envio de posição é direto.
- [x] Feedback: spinner no botão durante o envio + snackbar "Comando enviado"
      (nova chave i18n `commandSendConfirm` em en/pt/pt_BR).
- [x] Oculto para usuários `readonly`; some inteiro quando o dispositivo não suporta
      nenhum dos três comandos.
- [ ] Refinamento futuro: estado do último comando (fila/entregue) e botão Arm/Disarm
      estilo Ruhavik quando o protocolo suportar (`alarmArm`/`alarmDisarm`).

### Fase F — Dashboard / estatísticas ✅ (feita em 2026-07-20)
Nova página `/dashboard` (`web/src/other/DashboardPage.jsx`), item "Painel" na sidebar
(desktop, oculto quando `disableReports`) e rota registrada em `Navigation.jsx`:
- [x] Filtros: seletor de dispositivo (com opção "Todos os dispositivos") + chips de
      período (7 dias / 30 dias).
- [x] Base de dados: `/api/reports/summary?daily=true` agregado por dia; série diária
      preenchida por bucket (um ponto por dia, sem buracos no gráfico).
- [x] 4 KPIs: distância total, velocidade máxima, horas de motor, dispositivos ativos.
- [x] Gráficos recharts (cores 100% via tokens do tema, dark mode ok):
      barras de distância/dia, linha de velocidade máx/dia, barras de horas de motor/dia
      (só aparece se houver dados de engine hours) e ranking horizontal de veículos por
      distância (top 10, líder destacado em verde).
- [x] Respeita unidades do usuário (`distanceUnit`/`speedUnit`) via `useAttributePreference`.
- [x] i18n: chaves `dashboardTitle/AllDevices/ActiveDevices/DistancePerDay/Ranking` e
      `timelineTitle` (rótulo da Timeline migrado do texto hardcoded) em en/pt/pt_BR.
- [x] Build de produção validado (2265 módulos, sem erros de import).
- [ ] Refinamento futuro: entrada no menu inferior mobile (`BottomMenu`), período
      customizável e denominador de "dispositivos ativos" quando um único device é filtrado.

### Fase G — Geofences e notificações guiadas ✅ (feita em 2026-07-21)
Assistente e import/export na página `/geofences` (`web/src/other/GeofencesPage.jsx`):
- [x] **Assistente "cerca + alerta" em um fluxo só** (`web/src/other/GeofenceWizard.jsx`):
      ao desenhar uma cerca no mapa, abre um diálogo com nome + checkboxes
      "Alertar na entrada/saída" + seleção de canais (`/api/notifications/notificators`).
      Salva a geofence (`POST /api/geofences`) e cria as notificações
      `geofenceEnter`/`geofenceExit` já vinculadas (`always:true`,
      `attributes.geofenceIds = id`) em `POST /api/notifications`.
- [x] `MapGeofenceEdit` ganhou prop opcional `onCreate`: com ela o desenho abre o
      assistente; sem ela mantém o comportamento antigo (salvar + ir para a edição).
- [x] **Import KML** (além do GPX): o botão de upload aceita `.gpx,.kml`; `.kml` cria
      todas as placemarks (Polygon/LineString) de uma vez com feedback "N cercas".
- [x] **Export KML**: botão de download gera `geofences.kml` com todas as cercas
      (círculos viram polígono via turf, pois KML não tem geometria de círculo).
- [x] Utilitário `web/src/common/util/kml.js` (parse/build) reaproveita
      `geometryToArea`/`geofenceToFeature` — ordem lat/lon (WKT Traccar) ↔ lon,lat (KML).
- [x] i18n: `geofenceWizardTitle/Hint/Saved`, `geofenceAlertEntry/Exit`, `geofenceExport`
      em en/pt/pt_BR. Build de produção validado (2268 módulos, sem erros).
- [ ] Refinamento futuro: import `.kmz` (precisa de unzip/jszip), escolher dispositivos/
      grupos no assistente em vez de `always:true`, e lista de alertas já ativos por cerca.

### Ideias vindas de outros projetos (backlog de longo prazo)
| Ideia | Origem | Nota |
|---|---|---|
| Eco-driving score por viagem | Ruhavik | Calculável no frontend a partir de acelerações/velocidade das positions |
| Manutenção por km/horas | Ruhavik / Traccar | Traccar já tem `maintenance` — falta UX boa (alertas visuais) |
| Detecção automática de viagens refinada | GeoPulse | Traccar já usa `report.trip.*` config — expor tuning na UI |
| Compartilhamento ao vivo com link público | xsukax Live Tracker | SharePage já cobre parcialmente |
| Integração Home Assistant | [ha-flespi](https://github.com/dexif/ha-flespi) | Como o backend é Traccar, usar a **integração nativa Traccar do HA** (device_tracker) — documentar para clientes |
| Multi-protocolo/hardware barato (Sinotrack, Coban…) | eusonlito/GPS-Tracker | O Traccar já suporta 200+ protocolos — manter catálogo de dispositivos homologados |

## 4. Backlog técnico
- [ ] Rotacionar senha MySQL + limpar histórico git (ver seção 2).
- [ ] i18n: revisar strings PT restantes fora do sistema de tradução
      ("Motorista não identificado", saudações) e decidir idioma padrão do servidor.
- [ ] Histórico git: commits "first commit" repetidos; adotar mensagens descritivas.
- [ ] Revisão visual das páginas de settings/relatórios após o override global de inputs.
- [ ] Reconhecimento guiado da conta Ruhavik real (usuário loga, mapeamos telas) para
      calibrar as Fases B e C.
- [ ] Testes: não há testes; considerar smoke tests com Playwright (login + mapa).
- [ ] PWA: revisar ícones/manifest com a marca Argos Track.

## 5. Decisões e riscos
- **Traccar como backend**: mantém custo zero e compatibilidade com 200+ protocolos;
  todo o roadmap acima usa apenas APIs REST/WebSocket já existentes do Traccar.
- **Tema**: qualquer cor nova deve entrar em `palette.js` (tokens), nunca hardcoded
  em componente — isso garante dark mode e permite white-label via
  `server.attributes.colorPrimary/colorSecondary` (feature nativa do Traccar preservada).
- **react-window**: a lista de dispositivos exige altura fixa de linha
  (`dimensions.deviceRowHeight`); espaçamentos dos cards são internos à linha.
- **Override global de inputs**: afeta todos os formulários do app; se alguma tela de
  settings ficar estranha, ajustar o override em `components.js`, não a tela.
