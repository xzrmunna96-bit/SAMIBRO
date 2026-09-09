/**
 * Contact Links & Deeplink Handlers for Microsoft Teams and Skype
 * Direct profile chat targeting charlesjames997@outlook.com
 */

export const TEAMS_DIRECT_CHAT_URL = "https://teams.live.com/l/chat/0/0?users=charlesjames997@outlook.com";
export const TEAMS_WORK_CHAT_URL = "https://teams.microsoft.com/l/chat/0/0?users=charlesjames997@outlook.com";
export const SKYPE_DIRECT_CHAT_URL = "skype:charlesjames997@outlook.com?chat";
export const SKYPE_WEB_CHAT_URL = "https://web.skype.com/";

/**
 * Universal click handler to seamlessly launch Skype or Teams chat with charlesjames997@outlook.com
 */
export function handleOpenSkypeOrTeams(e?: React.MouseEvent) {
  if (e) {
    e.preventDefault();
  }

  try {
    // Open the official Microsoft Teams Personal Chat URL directly
    window.open(TEAMS_DIRECT_CHAT_URL, "_blank", "noopener,noreferrer");

    // Also trigger Skype URI protocol for users with Skype app installed
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = SKYPE_DIRECT_CHAT_URL;
    } else {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = SKYPE_DIRECT_CHAT_URL;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 1500);
    }
  } catch {
    window.open(TEAMS_DIRECT_CHAT_URL, "_blank", "noopener,noreferrer");
  }
}
