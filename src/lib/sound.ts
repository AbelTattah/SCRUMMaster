/**
 * The bundled alert sound (public/notification.mp3).
 *
 * Played from the page whenever an alert is raised — including the desktop
 * shell, where the page context owns notifications. Autoplay policies may
 * block a play before the user has interacted with the app; the OS toast
 * sound still fires in that case, so a refused play is never an error.
 */
let audio: HTMLAudioElement | null = null;

export function playAlertSound(volume = 0.85): void {
  try {
    if (!audio) {
      audio = new Audio("/notification.mp3");
      audio.preload = "auto";
    }

    audio.currentTime = 0;
    audio.volume = volume;
    void audio.play().catch(() => undefined);
  } catch {
    // No audio element (very old browser) — notifications still show.
  }
}
