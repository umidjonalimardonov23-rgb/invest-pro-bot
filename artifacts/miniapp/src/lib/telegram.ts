declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
          };
        };
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
        };
      };
    };
  }
}

export const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

export function getTelegramUser() {
  if (tg?.initDataUnsafe?.user) {
    return {
      telegramId: String(tg.initDataUnsafe.user.id),
      username: tg.initDataUnsafe.user.username ?? null,
      firstName: tg.initDataUnsafe.user.first_name ?? "Do'st",
    };
  }
  // Dev fallback
  return { telegramId: "dev_user_123", username: "devuser", firstName: "Dev User" };
}

export function closeMiniApp() {
  tg?.close();
}

export function initTelegram() {
  tg?.ready();
  tg?.expand();
}
