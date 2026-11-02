// Slots de foto do laudo de instalação. Precisa espelhar REQUIRED_PHOTO_SLOTS/PHOTO_SLOTS
// de argos-api/src/status.js — o servidor é quem valida na conclusão da ordem.
export const PHOTO_SLOTS = [
  { key: 'veiculo', labelKey: 'installPhotoSlotVehicle', required: true },
  { key: 'placa', labelKey: 'installPhotoSlotPlate', required: true },
  { key: 'etiqueta_imei', labelKey: 'installPhotoSlotTrackerLabel', required: true },
  { key: 'local_instalacao', labelKey: 'installPhotoSlotInstallLocation', required: true },
  { key: 'chicote', labelKey: 'installPhotoSlotHarness', required: true },
  { key: 'odometro', labelKey: 'installPhotoSlotOdometer', required: true },
  { key: 'teste_bloqueio', labelKey: 'installPhotoSlotBlockTest', required: false },
  { key: 'extra', labelKey: 'installPhotoSlotExtra', required: false, multiple: true },
];

export const SIGNATURE_SLOT = 'assinatura';

export const requiredSlots = () => PHOTO_SLOTS.filter((slot) => slot.required);

export default PHOTO_SLOTS;
