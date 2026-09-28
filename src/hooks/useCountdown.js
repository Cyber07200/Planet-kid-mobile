import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Обратный отсчёт для кнопки «Выслать код повторно (59 секунд)».
 */
export const useCountdown = (initialSeconds = 59) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (value = initialSeconds) => {
      clear();

      setSeconds(value);

      intervalRef.current = setInterval(() => {
        setSeconds((current) => {
          if (current <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            return 0;
          }

          return current - 1;
        });
      }, 1000);
    },
    [clear, initialSeconds],
  );

  useEffect(() => {
    start(initialSeconds);

    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    seconds,
    isFinished: seconds === 0,
    restart: start,
    stop: clear,
  };
};
