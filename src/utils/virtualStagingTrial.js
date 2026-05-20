function drawRoundedRect(ctx, x, y, width, height, radius, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawShadow(ctx, x, y, width, height, blur = 18, alpha = 0.18) {
  ctx.save();
  ctx.fillStyle = `rgba(33, 49, 40, ${alpha})`;
  ctx.shadowColor = `rgba(33, 49, 40, ${alpha})`;
  ctx.shadowBlur = blur;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function drawPlant(ctx, x, y, scale) {
  ctx.save();
  drawRoundedRect(ctx, x, y + 36 * scale, 34 * scale, 26 * scale, 8 * scale, "#d2b48c");
  ctx.fillStyle = "#5d7f5c";
  ctx.beginPath();
  ctx.ellipse(x + 17 * scale, y + 30 * scale, 18 * scale, 26 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 6 * scale, y + 24 * scale, 10 * scale, 18 * scale, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 28 * scale, y + 20 * scale, 11 * scale, 20 * scale, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLivingRoomStage(ctx, width, height) {
  const rugX = width * 0.22;
  const rugY = height * 0.67;
  const rugW = width * 0.56;
  const rugH = height * 0.19;
  drawShadow(ctx, rugX + 12, rugY + 14, rugW - 24, rugH - 24, 20, 0.08);
  drawRoundedRect(ctx, rugX, rugY, rugW, rugH, 28, "rgba(231, 217, 194, 0.82)");

  const sofaX = width * 0.26;
  const sofaY = height * 0.49;
  const sofaW = width * 0.48;
  const sofaH = height * 0.18;
  drawShadow(ctx, sofaX + 10, sofaY + 16, sofaW - 20, sofaH - 24, 22, 0.14);
  drawRoundedRect(ctx, sofaX, sofaY, sofaW, sofaH, 24, "rgba(214, 202, 188, 0.94)");
  drawRoundedRect(ctx, sofaX + sofaW * 0.06, sofaY + sofaH * 0.16, sofaW * 0.88, sofaH * 0.36, 18, "rgba(188, 174, 158, 0.95)");
  drawRoundedRect(ctx, sofaX + sofaW * 0.08, sofaY + sofaH * 0.5, sofaW * 0.84, sofaH * 0.26, 16, "rgba(245, 241, 235, 0.98)");

  drawRoundedRect(ctx, width * 0.42, height * 0.69, width * 0.16, height * 0.06, 18, "rgba(241, 233, 220, 0.95)");
  drawShadow(ctx, width * 0.455, height * 0.735, width * 0.09, height * 0.015, 10, 0.12);

  drawPlant(ctx, width * 0.13, height * 0.56, Math.max(width / 900, 0.7));
  drawPlant(ctx, width * 0.79, height * 0.54, Math.max(width / 960, 0.65));

  drawRoundedRect(ctx, width * 0.37, height * 0.19, width * 0.26, height * 0.14, 12, "rgba(255, 250, 244, 0.75)");
}

function drawBedroomStage(ctx, width, height) {
  const bedX = width * 0.24;
  const bedY = height * 0.48;
  const bedW = width * 0.52;
  const bedH = height * 0.24;
  drawShadow(ctx, bedX + 16, bedY + 16, bedW - 30, bedH - 20, 22, 0.14);
  drawRoundedRect(ctx, bedX, bedY, bedW, bedH, 18, "rgba(186, 174, 164, 0.94)");
  drawRoundedRect(ctx, bedX + bedW * 0.06, bedY + bedH * 0.18, bedW * 0.88, bedH * 0.44, 18, "rgba(246, 242, 236, 0.98)");
  drawRoundedRect(ctx, bedX + bedW * 0.12, bedY + bedH * 0.04, bedW * 0.76, bedH * 0.16, 14, "rgba(229, 221, 213, 0.98)");
  drawRoundedRect(ctx, width * 0.3, height * 0.7, width * 0.4, height * 0.12, 24, "rgba(230, 219, 201, 0.8)");

  drawRoundedRect(ctx, width * 0.16, height * 0.56, width * 0.08, height * 0.12, 10, "rgba(207, 192, 178, 0.95)");
  drawRoundedRect(ctx, width * 0.76, height * 0.56, width * 0.08, height * 0.12, 10, "rgba(207, 192, 178, 0.95)");
  drawPlant(ctx, width * 0.13, height * 0.51, Math.max(width / 1100, 0.55));
  drawPlant(ctx, width * 0.8, height * 0.5, Math.max(width / 1100, 0.55));
  drawRoundedRect(ctx, width * 0.38, height * 0.2, width * 0.24, height * 0.13, 12, "rgba(252, 247, 241, 0.72)");
}

function drawDiningStage(ctx, width, height) {
  drawRoundedRect(ctx, width * 0.28, height * 0.63, width * 0.44, height * 0.16, 70, "rgba(229, 218, 200, 0.8)");
  drawShadow(ctx, width * 0.38, height * 0.59, width * 0.24, height * 0.03, 16, 0.12);
  drawRoundedRect(ctx, width * 0.38, height * 0.48, width * 0.24, height * 0.09, 24, "rgba(244, 236, 225, 0.97)");
  drawRoundedRect(ctx, width * 0.29, height * 0.51, width * 0.07, height * 0.13, 16, "rgba(203, 188, 170, 0.95)");
  drawRoundedRect(ctx, width * 0.64, height * 0.51, width * 0.07, height * 0.13, 16, "rgba(203, 188, 170, 0.95)");
  drawRoundedRect(ctx, width * 0.41, height * 0.7, width * 0.07, height * 0.12, 16, "rgba(203, 188, 170, 0.95)");
  drawRoundedRect(ctx, width * 0.52, height * 0.7, width * 0.07, height * 0.12, 16, "rgba(203, 188, 170, 0.95)");
  drawPlant(ctx, width * 0.14, height * 0.53, Math.max(width / 980, 0.62));
  drawRoundedRect(ctx, width * 0.42, height * 0.18, width * 0.16, height * 0.17, 18, "rgba(254, 249, 242, 0.7)");
}

export const VIRTUAL_STAGING_PRESETS = [
  { value: "living-room", label: "Living Room Trial" },
  { value: "bedroom", label: "Bedroom Trial" },
  { value: "dining", label: "Dining Trial" },
];

export async function generateTrialStagedPhotoDataUrl(sourceDataUrl, preset = "living-room") {
  const img = await new Promise((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = () => reject(new Error("Image load failed."));
    next.src = sourceDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = "rgba(255, 248, 238, 0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (preset === "bedroom") {
    drawBedroomStage(ctx, canvas.width, canvas.height);
  } else if (preset === "dining") {
    drawDiningStage(ctx, canvas.width, canvas.height);
  } else {
    drawLivingRoomStage(ctx, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}
