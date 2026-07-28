export async function publicUpload(action, payload, turnstileToken) {
  if (!turnstileToken) throw new Error("Please complete the security check before uploading.");
  const response = await fetch("/.netlify/functions/public-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, turnstileToken, ...payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.error || "Upload failed. Please try again.");
  return body.data;
}
