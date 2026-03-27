const getDefaultWebhookUrl = () =>
  (import.meta.env.VITE_N8N_BASE_URL || "").replace(/\/$/, "");

const getDefaultWebhookToken = () => import.meta.env.VITE_N8N_SECRET || "";

const parseWebhookResponse = async (resp) => {
  const text = await resp.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const uploadFileToWebhook = async ({
  file,
  webhookUrl,
  fileFieldName = "file",
  fields = {},
  headers = {},
  token = getDefaultWebhookToken(),
  tokenHeaderName = (
    import.meta.env.VITE_N8N_HEADER_NAME || "X-N8N-Token"
  ).trim(),
}) => {
  if (!file) {
    throw new Error("File is required");
  }

  const resolvedUrl = String(webhookUrl || getDefaultWebhookUrl()).trim();
  if (!resolvedUrl) {
    throw new Error("Webhook URL is not configured");
  }

  const form = new FormData();
  form.append(fileFieldName, file);

  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  const finalHeaders = {
    ...headers,
    ...(token ? { [tokenHeaderName]: token } : {}),
  };

  const resp = await fetch(resolvedUrl, {
    method: "POST",
    headers: finalHeaders,
    body: form,
  });

  const payload = await parseWebhookResponse(resp);
  if (!resp.ok) {
    const message =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" ? payload : "");
    throw new Error(message || "Upload failed");
  }

  return {
    status: resp.status,
    payload,
  };
};
