import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Сообщение, которое само исчезает через несколько секунд.
 *
 * Таймер сбрасывается при новом сообщении и при уходе с экрана —
 * иначе он обновил бы состояние уже размонтированного компонента.
 */
export const useFlashMessage = (duration = 3000) => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const show = useCallback(
    (value) => {
      clearTimeout(timerRef.current);
      setMessage(value);

      if (value) {
        timerRef.current = setTimeout(() => setMessage(null), duration);
      }
    },
    [duration],
  );

  return [message, show];
};
