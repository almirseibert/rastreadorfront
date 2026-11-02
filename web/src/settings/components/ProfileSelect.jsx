import { useMemo } from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useSelector } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { parseProfiles } from '../../common/util/useAccess';

// Seletor do "tipo de usuário" (perfil de acesso) usado nos assistentes de criação.
// Não renderiza nada quando ainda não existe nenhum perfil cadastrado.
const ProfileSelect = ({ value, onChange, label }) => {
  const t = useTranslation();
  const server = useSelector((state) => state.session.server);
  const profiles = useMemo(() => parseProfiles(server), [server]);

  if (!profiles.length) {
    return null;
  }

  return (
    <FormControl fullWidth>
      <InputLabel>{label || t('userProfile')}</InputLabel>
      <Select
        label={label || t('userProfile')}
        value={profiles.some((profile) => profile.id === value) ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">{t('userProfileNone')}</MenuItem>
        {profiles.map((profile) => (
          <MenuItem key={profile.id} value={profile.id}>
            {profile.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ProfileSelect;
