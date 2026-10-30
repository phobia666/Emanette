import { useState, useEffect, useRef } from 'react';

/**
 * High-precision countdown hook that corrects for server-client clock skew
 * @param {number} targetTimestamp - server timestamp when timer expires
 * @param {number} offset - serverNow - clientNow skew offset in ms
 * @param {number} totalDurationSec - total duration of the period in seconds
 */
export function useCountdown(targetTimestamp, offset = 0, totalDurationSec = 10) {
  const [timeLeftMs, setTimeLeftMs] = useState(() => {
    if (!targetTimestamp) return 0;
    const nowServer = Date.now() + offset;
    return Math.max(0, targetTimestamp - nowServer);
  });

  const requestRef = useRef();

  useEffect(() => {
    if (!targetTimestamp) {
      setTimeLeftMs(0);
      return;
    }

    const update = () => {
      const nowServer = Date.now() + offset;
      const diff = Math.max(0, targetTimestamp - nowServer);
      setTimeLeftMs(diff);

      if (diff > 0) {
        requestRef.current = requestAnimationFrame(update);
      }
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [targetTimestamp, offset]);

  const remainingSec = timeLeftMs / 1000;
  const secondsDisplay = Math.ceil(remainingSec);
  const totalMs = (totalDurationSec || 10) * 1000;
  const progressRatio = totalMs > 0 ? Math.min(1, Math.max(0, timeLeftMs / totalMs)) : 0;
  const isWarning = remainingSec <= 3 && remainingSec > 0;
  const isEnded = timeLeftMs <= 0;

  return {
    timeLeftMs,
    remainingSec,
    secondsDisplay,
    progressRatio,
    isWarning,
    isEnded,
  };
}

