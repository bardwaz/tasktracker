export interface SendTaskAlertParams {
  toPhone: string;
  taskTitle: string;
  description?: string;
  priority: string;
  assignerName: string;
  assignerLevel: number;
  dueDate?: string;
}

/**
 * Sanitizes phone numbers into E.164 without leading '+' (required by Meta WhatsApp API).
 * e.g., '+91 98765-43210' -> '919876543210'
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

const PRIORITY_EMOJIS: Record<string, string> = {
  URGENT: "🔴",
  HIGH: "🟠",
  MEDIUM: "🔵",
  LOW: "⚪",
};

/**
 * Dispatches an immediate WhatsApp message to the recipient using Meta WhatsApp Cloud API.
 */
export async function sendWhatsAppTaskAlert(
  params: SendTaskAlertParams
): Promise<{ success: boolean; error?: string; messageId?: string; dryRun?: boolean }> {
  const {
    toPhone,
    taskTitle,
    description,
    priority,
    assignerName,
    assignerLevel,
    dueDate,
  } = params;

  const recipient = cleanPhoneNumber(toPhone);
  if (!recipient || recipient.length < 8) {
    console.warn(`[WhatsApp] Invalid phone number skipped: "${toPhone}"`);
    return { success: false, error: "Invalid phone number" };
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  const emoji = PRIORITY_EMOJIS[priority.toUpperCase()] || "🔵";
  const formattedDueDate = dueDate
    ? `\n📅 *Due Date*: ${new Date(dueDate).toLocaleDateString()}`
    : "";
  const formattedDesc = description
    ? `\n\n*Description*:\n${description}`
    : "";

  const messageText = `📋 *New Task Assigned on TaskTracker!*

📌 *Task*: *${taskTitle}*
⚡ *Priority*: ${emoji} ${priority}
👤 *Assigned By*: ${assignerName} (Level ${assignerLevel})${formattedDueDate}${formattedDesc}

👉 Open TaskTracker to track and update your task status.`;

  // Dry-run mode if credentials are missing
  if (!phoneId || !token) {
    console.log(`[WhatsApp Dry-Run] To: ${recipient}\n${messageText}`);
    return { success: true, dryRun: true };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: messageText,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn("[WhatsApp Cloud API Warning]:", JSON.stringify(data.error || data));

      // If user is outside 24h window (error 131047), fall back to Template Message
      const isWindowError =
        data.error?.code === 131047 ||
        data.error?.error_subcode === 2494011 ||
        data.error?.message?.includes("24 hours");

      if (isWindowError) {
        console.log(`[WhatsApp] Recipient outside 24h window. Attempting template message fallback to ${recipient}...`);
        const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "hello_world";
        const templateRes = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipient,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en_US" },
            },
          }),
        });

        const templateData = await templateRes.json();
        if (templateRes.ok && !templateData.error) {
          const tId = templateData.messages?.[0]?.id;
          console.log(`[WhatsApp] Template fallback successfully delivered (ID: ${tId})`);
          return { success: true, messageId: tId };
        }
      }

      return {
        success: false,
        error: data.error?.message || "Failed to send WhatsApp message",
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`[WhatsApp] Alert successfully sent to ${recipient} (Message ID: ${messageId})`);
    return { success: true, messageId };
  } catch (err: any) {
    console.error("[WhatsApp Network Error]:", err.message || err);
    return { success: false, error: err.message || "Network error sending WhatsApp alert" };
  }
}
