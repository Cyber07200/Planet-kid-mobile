/**
 * Работа с телефоном.
 *
 * Логика 1-в-1 перенесена из веб-проекта
 * (src/contexts/AuthContext.tsx и src/components/landing/AuthModal.tsx),
 * чтобы номера в базе оставались в том же формате: +7XXXXXXXXXX.
 */

export const normalizePhone = (phone) => {
  return String(phone || '').replace(/\D/g, '');
};

/**
 * Приводит номер к виду, в котором он хранится в таблице users.
 */
export const formatPhoneForDatabase = (phone) => {
  const digits = normalizePhone(phone);

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return String(phone || '').trim();
};


/**
 * Маска без префикса «+7» — под макет, где +7 вынесен
 * в отдельный блок слева от поля: (999) 999-99-99
 */
export const formatPhoneBody = (value) => {
  const digits = normalizePhone(value);

  let normalized = digits;

  if (normalized.startsWith('8') || normalized.startsWith('7')) {
    if (normalized.length > 10) {
      normalized = normalized.slice(1);
    }
  }

  normalized = normalized.slice(0, 10);

  if (!normalized) {
    return '';
  }

  let result = `(${normalized.slice(0, 3)}`;

  if (normalized.length >= 3) {
    result += ')';
  }

  if (normalized.length > 3) {
    result += ` ${normalized.slice(3, 6)}`;
  }

  if (normalized.length > 6) {
    result += `-${normalized.slice(6, 8)}`;
  }

  if (normalized.length > 8) {
    result += `-${normalized.slice(8, 10)}`;
  }

  return result;
};

export const isValidPhone = (phone) => {
  return normalizePhone(phone).length === 11;
};

/**
 * Красивый вывод номера в интерфейсе.
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone) {
    return 'Телефон не указан';
  }

  const digits = normalizePhone(phone);

  if (digits.length !== 11) {
    return phone;
  }

  const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;

  if (!normalized.startsWith('7')) {
    return phone;
  }

  return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(
    7,
    9,
  )}-${normalized.slice(9, 11)}`;
};
