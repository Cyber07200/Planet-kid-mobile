import { useCallback, useState } from 'react';

import { useAuth } from '../context/AuthContext';

/**
 * Подтверждение выхода из аккаунта.
 *
 * Выход стирает сохранённую сессию, и родителю потом
 * снова понадобится код из смс — случайное нажатие
 * на «Выйти из аккаунта» не должно этого делать.
 *
 * Диалог — тот же ConfirmDialog, что и в макете
 * «Notification (Modal)» для очистки уведомлений.
 */
export const useLogoutConfirm = () => {
  const { logout } = useAuth();

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestLogout = useCallback(() => {
    setVisible(true);
  }, []);

  const confirm = useCallback(async () => {
    setLoading(true);

    try {
      await logout();
    } finally {
      setLoading(false);
      setVisible(false);
    }
  }, [logout]);

  const cancel = useCallback(() => {
    if (!loading) {
      setVisible(false);
    }
  }, [loading]);

  return {
    requestLogout,
    dialogProps: {
      visible,
      title: 'Выйти из аккаунта?',
      confirmLabel: 'Выйти',
      cancelLabel: 'Остаться',
      onConfirm: confirm,
      onCancel: cancel,
      loading,
    },
  };
};
