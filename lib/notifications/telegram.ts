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

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (!json.ok) {
      return { ok: false, error: json.description ?? "Telegram API returned ok:false" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Escapa los caracteres reservados del modo Markdown legacy de Telegram. No
// usamos MarkdownV2 porque la spec del usuario fue explícita: parse_mode = "Markdown".
// Los caracteres a escapar son los que pueden abrir formato: _ * ` [
export function escapeTelegramMarkdown(input: string): string {
  return input.replace(/([_*`\[])/g, "\\$1");
}
