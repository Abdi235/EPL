import { useEffect, useRef, useState } from 'react';

const VOLUME_KEY = 'eplAnthemVolume';
const YT_PLAYLIST_ID = 'PLlmyYmqoMXCsDoF4-oS_cTnwT3Qli-ibh';
const DEFAULT_VOLUME = 0.08;

const BackgroundAnthems = () => {
  const playerRef = useRef(null);
  const savedVolumeRef = useRef(DEFAULT_VOLUME);
  const tabAutoMutedRef = useRef(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [volume, setVolume] = useState(() => {
    const raw = localStorage.getItem(VOLUME_KEY);
    const n = raw == null ? DEFAULT_VOLUME : Number(raw);
    const clamped = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_VOLUME;
    return Math.min(clamped, DEFAULT_VOLUME);
  });
  savedVolumeRef.current = tabAutoMutedRef.current ? savedVolumeRef.current : volume;

  useEffect(() => {
    const ensureYoutubeApi = () =>
      new Promise((resolve) => {
        if (window.YT?.Player) {
          resolve();
          return;
        }

        const existing = document.getElementById('youtube-iframe-api');
        if (!existing) {
          const script = document.createElement('script');
          script.id = 'youtube-iframe-api';
          script.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(script);
        }

        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prev === 'function') prev();
          resolve();
        };
      });

    let mounted = true;

    ensureYoutubeApi().then(() => {
      if (!mounted || !window.YT?.Player || playerRef.current) return;

      playerRef.current = new window.YT.Player('yt-anthems-player', {
        height: '0',
        width: '0',
        playerVars: {
          listType: 'playlist',
          list: YT_PLAYLIST_ID,
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(Math.round(savedVolumeRef.current * 100));
            event.target.setShuffle(true);
            setPlayerReady(true);
            event.target.playVideo();
          },
        },
      });
    });

    return () => {
      mounted = false;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(Math.round(volume * 100));
    }
  }, [volume]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!playerRef.current?.setVolume) return;

      if (document.hidden && !tabAutoMutedRef.current) {
        tabAutoMutedRef.current = true;
        savedVolumeRef.current = volume;
        setVolume(0);
        playerRef.current.setVolume(0);
      } else if (!document.hidden && tabAutoMutedRef.current) {
        tabAutoMutedRef.current = false;
        setVolume(savedVolumeRef.current || DEFAULT_VOLUME);
        playerRef.current.setVolume(Math.round((savedVolumeRef.current || DEFAULT_VOLUME) * 100));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [volume]);

  return (
    <div
      id="yt-anthems-player"
      aria-hidden={!playerReady}
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    />
  );
};

export default BackgroundAnthems;
