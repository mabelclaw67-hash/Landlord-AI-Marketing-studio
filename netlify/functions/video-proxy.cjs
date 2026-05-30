exports.handler = async function videoProxy(event) {
  const sourceUrl = String(event.queryStringParameters?.url || "").trim();
  if (!sourceUrl) {
    return { statusCode: 400, body: "Missing video URL" };
  }

  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    return { statusCode: 400, body: "Invalid video URL" };
  }

  const allowedHost = url.hostname === "drive.google.com" || url.hostname === "drive.usercontent.google.com";
  if (!allowedHost) {
    return { statusCode: 400, body: "Unsupported video source" };
  }

  const headers = {};
  if (event.headers?.range) headers.Range = event.headers.range;

  const response = await fetch(url.toString(), { headers, redirect: "follow" });
  const arrayBuffer = await response.arrayBuffer();

  const responseHeaders = {
    "Content-Type": response.headers.get("content-type") || "video/mp4",
    "Accept-Ranges": response.headers.get("accept-ranges") || "bytes",
    "Cache-Control": "public, max-age=3600",
  };

  const contentLength = response.headers.get("content-length");
  const contentRange = response.headers.get("content-range");
  if (contentLength) responseHeaders["Content-Length"] = contentLength;
  if (contentRange) responseHeaders["Content-Range"] = contentRange;

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: Buffer.from(arrayBuffer).toString("base64"),
    isBase64Encoded: true,
  };
};
