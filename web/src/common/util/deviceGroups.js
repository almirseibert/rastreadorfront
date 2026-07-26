// Filtra dispositivos pelo grupo/empresa selecionado na barra de topo (0 = todos),
// considerando a hierarquia de grupos (subgrupo herda o filtro do grupo pai).
export const deviceInGroup = (device, groups, groupId) => {
  if (!groupId) {
    return true;
  }
  let current = device.groupId;
  while (current) {
    if (current === groupId) {
      return true;
    }
    current = groups[current]?.groupId || 0;
  }
  return false;
};

export const filterDevicesByGroup = (devices, groups, groupId) =>
  Object.values(devices)
    .filter((device) => deviceInGroup(device, groups, groupId))
    .sort((a, b) => a.name.localeCompare(b.name));
