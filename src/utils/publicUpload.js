export async function publicUpload(action, payload, turnstileToken) {
  if (!turnstileToken) throw new Error("Please complete the security check before uploading.");
  let response;
  try {
    response = await fetch("/.netlify/functions/public-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, turnstileToken, ...payload }),
    });
  } catch {
    throw new Error("We could not reach the server. Please check your internet connection and try again.");
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 413) throw new Error("File is too large. Please upload files up to 4 MB each.");
  if (!response.ok || !body.ok) throw new Error(body.error || "Upload failed. Please try again.");
  return body.data;
}
