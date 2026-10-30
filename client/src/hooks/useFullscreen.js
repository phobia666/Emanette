import { useState, useEffect, useCallback, useRef } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wakeLockRef = useRef(null);

  // Check fullscreen state
  useEffect(() => {
    const updateFsState = () => {
      const active = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(active);
    };

    updateFsState();

    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
    document.addEventListener('mozfullscreenchange', updateFsState);
    document.addEventListener('MSFullscreenChange', updateFsState);

    return () => {
      document.removeEventListener('fullscreenchange', updateFsState);
      document.removeEventListener('webkitfullscreenchange', updateFsState);
      document.removeEventListener('mozfullscreenchange', updateFsState);
      document.removeEventListener('MSFullscreenChange', updateFsState);
    };
  }, []);

  // Wake lock helper
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        // Wake lock may fail if unsupported or battery saver is on
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire wake lock when tab visibility returns
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isFullscreen) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isFullscreen, requestWakeLock]);

  const enter = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' });
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch (e) {
      // Fullscreen may not be supported (e.g. iOS Safari) or denied
    }
    await requestWakeLock();
  }, [requestWakeLock]);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (e) {
      // ignore
    }
    await releaseWakeLock();
  }, [releaseWakeLock]);

  return {
    isFullscreen,
    enter,
    exit,
    requestWakeLock,
    releaseWakeLock,
  };
}

