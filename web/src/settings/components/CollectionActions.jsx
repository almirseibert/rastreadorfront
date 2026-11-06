import { useState } from 'react';
import { IconButton, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { makeStyles } from 'tss-react/mui';
import RemoveDialog from '../../common/components/RemoveDialog';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { usePageEditable } from '../../common/util/useAccess';

const useStyles = makeStyles()(() => ({
  row: {
    display: 'flex',
  },
}));

const CollectionActions = ({
  itemId,
  editPath,
  endpoint,
  baseUrl,
  setTimestamp,
  customActions,
  readonly: readonlyProp,
}) => {
  const theme = useTheme();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  // Somente leitura quando a prop pede OU quando o perfil de acesso não permite editar a página.
  const editable = usePageEditable();
  const readonly = readonlyProp || !editable;

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);

  const handleEdit = () => {
    navigate(`${editPath}/${itemId}`);
    setMenuAnchorEl(null);
  };

  const handleRemove = () => {
    setRemoving(true);
    setMenuAnchorEl(null);
  };

  const handleCustom = (action) => {
    action.handler(itemId);
    setMenuAnchorEl(null);
  };

  const handleRemoveResult = (removed) => {
    setRemoving(false);
    if (removed) {
      setTimestamp(Date.now());
    }
  };

  return (
    <>
      {phone ? (
        <>
          <IconButton size="small" onClick={(event) => setMenuAnchorEl(event.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu open={!!menuAnchorEl} anchorEl={menuAnchorEl} onClose={() => setMenuAnchorEl(null)}>
            {customActions &&
              customActions.map((action) => (
                <MenuItem onClick={() => handleCustom(action)} key={action.key}>
                  {action.title}
                </MenuItem>
              ))}
            {!readonly && (
              <>
                {editPath && <MenuItem onClick={handleEdit}>{t('sharedEdit')}</MenuItem>}
                <MenuItem onClick={handleRemove}>{t('sharedRemove')}</MenuItem>
              </>
            )}
          </Menu>
        </>
      ) : (
        <div className={classes.row}>
          {customActions &&
            customActions.map((action) => (
              <Tooltip title={action.title} key={action.key}>
                <IconButton size="small" onClick={() => handleCustom(action)}>
                  {action.icon}
                </IconButton>
              </Tooltip>
            ))}
          {!readonly && (
            <>
              {editPath && (
                <Tooltip title={t('sharedEdit')}>
                  <IconButton size="small" onClick={handleEdit}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={t('sharedRemove')}>
                <IconButton size="small" onClick={handleRemove}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
      )}
      <RemoveDialog
        style={{ transform: 'none' }}
        open={removing}
        endpoint={endpoint}
        baseUrl={baseUrl}
        itemId={itemId}
        onResult={handleRemoveResult}
      />
    </>
  );
};

export default CollectionActions;
