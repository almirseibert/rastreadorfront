import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorsActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import useAccess from '../util/useAccess';

// Guarda de rota dos perfis de acesso: esconder o item de menu não basta, porque o usuário
// pode digitar a URL. Envolve o elemento da rota em Navigation.jsx; sem permissão, redireciona
// para a primeira página liberada e mostra o aviso no snackbar global de erros.
//
// props:
//   page      chave da página em common/util/pages.js (explícita, não inferida do pathname)
//   selfParam nome do parâmetro de rota que, quando igual ao id do usuário logado, libera o
//             acesso — usado em /settings/user/:id, que é a conta do próprio usuário
const RequirePage = ({ page, selfParam, children }) => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const params = useParams();

  const { canView, firstAllowedPath } = useAccess();
  const userId = useSelector((state) => state.session.user?.id);

  const self = !!selfParam && String(params[selfParam]) === String(userId);
  const allowed = self || canView(page);

  useEffect(() => {
    if (!allowed) {
      dispatch(errorsActions.push(t('accessDenied') || 'Access denied'));
    }
  }, [allowed, dispatch, t]);

  if (!allowed) {
    return <Navigate to={firstAllowedPath} replace />;
  }
  return children;
};

export default RequirePage;
