type SendArgs = {
  chatId: string;
  text: string;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  disableWebPagePreview?: boolean;
};

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendTelegramMessage(args: SendArgs): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: args.chatId,
        text: args.text,
        parse_mode: args.parseMode ?? "Markdown",
        disable_web_page_preview: args.disableWebPagePreview ?? true,
      }),
    });

    const body = await res.text();
    let parsed: { ok?: boolean; description?: string } = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      // body no es JSON
    }
    if (!res.ok || !parsed.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status} ${parsed.description ?? body.slice(0, 300)}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Escapa los caracteres reservados de HTML para que el texto del usuario no
// rompa el parse_mode='HTML' de Telegram.
export function escapeTelegramHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
