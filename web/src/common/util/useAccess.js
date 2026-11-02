import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { PAGES, PAGE_MAP, assignablePages, pageByPath } from './pages';

// Perfis de acesso ("tipos de usuário") do Argos Track.
//
// O backend é o Traccar oficial, então não há tabela própria: o catálogo de perfis vive em
// server.attributes (legível por qualquer sessão via GET /api/server, gravável só por admin) e
// a atribuição vive em user.attributes. Veja MELHORIAS.md para a justificativa.
//
// IMPORTANTE: isto é uma camada de UI. O isolamento de dados ("o cliente só vê os veículos
// dele") continua sendo garantido pelo backend através das permissões de device/grupo. Os
// perfis removem telas indevidas e desabilitam edição, somando-se (AND) às flags nativas
// readonly / deviceReadonly / disableReports.

export const PROFILES_ATTRIBUTE = 'argos.profiles';
export const PROFILE_ATTRIBUTE = 'argos.profile';
export const PAGES_EXTRA_ATTRIBUTE = 'argos.pagesExtra';
export const PAGES_DENY_ATTRIBUTE = 'argos.pagesDeny';

export const LEVEL_HIDDEN = 'hidden';
export const LEVEL_VIEW = 'view';
export const LEVEL_EDIT = 'edit';

// --------------------------------------------------------------------------- serialização

export const parseProfiles = (server) => {
  const raw = server?.attributes?.[PROFILES_ATTRIBUTE];
  if (!raw) {
    return [];
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const profiles = Array.isArray(parsed) ? parsed : parsed.profiles;
    return Array.isArray(profiles) ? profiles.filter((it) => it && it.id) : [];
  } catch {
    return [];
  }
};

export const stringifyProfiles = (profiles) => JSON.stringify({ v: 1, profiles });

// "mapa:view,trips:edit" ou "mapa,trips" (sem nível = view) -> { mapa: 'view', trips: 'edit' }
export const parseOverrides = (raw) => {
  if (!raw) {
    return {};
  }
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [key, level] = part.split(':');
      return { ...acc, [key.trim()]: level?.trim() === LEVEL_EDIT ? LEVEL_EDIT : LEVEL_VIEW };
    }, {});
};

export const stringifyOverrides = (map) =>
  Object.entries(map || {})
    .filter(([, level]) => level === LEVEL_VIEW || level === LEVEL_EDIT)
    .map(([key, level]) => `${key}:${level}`)
    .join(',');

export const parseDenied = (raw) =>
  String(raw || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const defaultProfile = (profiles) => profiles.find((profile) => profile.default) || null;

export const profileById = (profiles, id) => profiles.find((profile) => profile.id === id) || null;

// --------------------------------------------------------------------------- flags nativas

// Mesma precedência de useFeatures.js (server.forceSettings decide quem ganha).
const featureFlag = (server, user, key) => {
  if (user.administrator) {
    return false;
  }
  if (server.forceSettings) {
    return server.attributes?.[key] || user.attributes?.[key] || false;
  }
  return user.attributes?.[key] || server.attributes?.[key] || false;
};

// Mesma regra de useRestriction em permissions.js.
const restrictionFlag = (server, user, key) =>
  !user.administrator && (server[key] || user[key] || false);

// --------------------------------------------------------------------------- resolução

const accessSelector = createSelector(
  (state) => state.session.server,
  (state) => state.session.user,
  (server, user) => {
    const levels = {};

    if (!server || !user) {
      return {
        levels,
        profile: null,
        profiles: [],
        administrator: false,
        manager: false,
        legacy: true,
      };
    }

    const administrator = !!user.administrator;
    const manager = administrator || (user.userLimit || 0) !== 0;
    const profiles = parseProfiles(server);
    const profile = administrator
      ? null
      : profileById(profiles, user.attributes?.[PROFILE_ATTRIBUTE]);

    // Sem perfil atribuído, o comportamento é o de antes dos perfis (compatibilidade):
    // todas as páginas liberadas, respeitando apenas as flags nativas.
    const legacy = !administrator && !profile;

    PAGES.forEach((page) => {
      let level;
      if (administrator) {
        level = LEVEL_EDIT;
      } else if (page.always) {
        level = LEVEL_EDIT;
      } else if (page.adminOnly) {
        level = LEVEL_HIDDEN;
      } else if (page.managerOnly) {
        // Páginas de gestão não entram na matriz do perfil: quem é gestor no Traccar as vê.
        level = manager ? LEVEL_EDIT : LEVEL_HIDDEN;
      } else if (legacy) {
        level = LEVEL_EDIT;
      } else {
        level = profile.pages?.[page.key] || LEVEL_HIDDEN;
      }
      levels[page.key] = level;
    });

    // Exceções por usuário: "adicionar certa página" a alguém sem criar um perfil novo.
    if (!administrator) {
      const extra = parseOverrides(user.attributes?.[PAGES_EXTRA_ATTRIBUTE]);
      Object.entries(extra).forEach(([key, level]) => {
        const page = PAGE_MAP[key];
        if (page && !page.adminOnly && !page.managerOnly) {
          levels[key] = level;
        }
      });
      // Bloqueio explícito vence tudo (inclusive páginas de gestão).
      parseDenied(user.attributes?.[PAGES_DENY_ATTRIBUTE]).forEach((key) => {
        if (PAGE_MAP[key] && !PAGE_MAP[key].always) {
          levels[key] = LEVEL_HIDDEN;
        }
      });
    }

    // Flags nativas do Traccar continuam valendo em conjunto (AND).
    PAGES.forEach((page) => {
      if (levels[page.key] === LEVEL_HIDDEN) {
        return;
      }
      if (page.restriction && restrictionFlag(server, user, page.restriction)) {
        levels[page.key] = LEVEL_HIDDEN;
        return;
      }
      if (page.feature && featureFlag(server, user, page.feature)) {
        levels[page.key] = LEVEL_HIDDEN;
        return;
      }
      if (
        levels[page.key] === LEVEL_EDIT &&
        page.editable &&
        restrictionFlag(server, user, 'readonly')
      ) {
        levels[page.key] = LEVEL_VIEW;
      }
    });

    return { levels, profile, profiles, administrator, manager, legacy };
  },
);

const FALLBACK_ORDER = ['map', 'install', 'trips', 'dashboard', 'timeline', 'reports.combined'];

const useAccess = () => {
  const { levels, profile, profiles, administrator, manager, legacy } = useSelector(accessSelector);

  const canView = (key) => levels[key] === LEVEL_VIEW || levels[key] === LEVEL_EDIT;
  const canEdit = (key) => levels[key] === LEVEL_EDIT;

  const allowedPages = PAGES.filter((page) => canView(page.key));

  // Para onde mandar quem cai numa página sem permissão.
  const fallbackKey = FALLBACK_ORDER.find((key) => canView(key)) || allowedPages[0]?.key;
  const firstAllowedPath = fallbackKey ? PAGE_MAP[fallbackKey].path : '/';

  return {
    levels,
    level: (key) => levels[key] || LEVEL_HIDDEN,
    canView,
    canEdit,
    canViewPath: (pathname) => canView(pathname),
    allowedPages,
    firstAllowedPath,
    profile,
    profiles,
    administrator,
    manager,
    legacy,
    assignable: assignablePages(),
  };
};

// A página atual permite edição? Usado pelos componentes compartilhados (FAB de criar,
// ações de editar/excluir, botão Salvar) para não precisar passar o nível em cascata.
// Páginas sem distinção leitura × edição e rotas fora do registro retornam true, de modo que
// nada que já funcionava passa a ficar bloqueado.
export const usePageEditable = () => {
  const { pathname } = useLocation();
  const { canEdit } = useAccess();
  const page = pageByPath(pathname);
  if (!page || !page.editable) {
    return true;
  }
  return canEdit(page.key);
};

export default useAccess;
