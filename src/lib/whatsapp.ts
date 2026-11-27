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
    // Primary Dispatch: Use approved Template (guarantees delivery outside 24h window to any phone)
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "task_assignment";
    const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || "en";

    const templatePayload: any = {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: (taskTitle || "New Task").slice(0, 60) },
            { type: "text", text: priority || "MEDIUM" },
            { type: "text", text: `${assignerName || "Manager"} (L${assignerLevel})`.slice(0, 40) },
            { type: "text", text: dueDate ? new Date(dueDate).toLocaleDateString() : "No deadline" },
            { type: "text", text: (description && description.trim() ? description.trim() : "No additional details").slice(0, 200) },
          ],
        },
      ],
    };

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
        template: templatePayload,
      }),
    });

    const templateData = await templateRes.json();

    if (templateRes.ok && !templateData.error) {
      const messageId = templateData.messages?.[0]?.id;
      console.log(`[WhatsApp] Template alert successfully dispatched to ${recipient} (ID: ${messageId})`);
      return { success: true, messageId };
    }

    console.warn("[WhatsApp Template Warning, attempting text fallback]:", JSON.stringify(templateData.error || templateData));

    // Fallback: Free-form text message (works if 24h window is open)
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
      console.error("[WhatsApp Cloud API Error]:", JSON.stringify(data.error || data));
      return {
        success: false,
        error: data.error?.message || templateData.error?.message || "Failed to send WhatsApp message",
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`[WhatsApp] Text alert successfully sent to ${recipient} (Message ID: ${messageId})`);
    return { success: true, messageId };
  } catch (err: any) {
    console.error("[WhatsApp Network Error]:", err.message || err);
    return { success: false, error: err.message || "Network error sending WhatsApp alert" };
  }
}
