// src/utils/image.js — compressão de imagens antes do upload.
// Redimensiona a foto no próprio dispositivo e re-codifica em JPEG, reduzindo
// drasticamente o tamanho (uma foto de 3 MB vira ~200-400 KB). Isso multiplica
// o quanto cabe no plano gratuito de Storage. Arquivos que não são imagem
// (PDF, CSV, XLSX) ou formatos que não dá pra recodificar passam sem alteração.

const COMPRESSIVEIS = ["image/jpeg", "image/png", "image/webp"];

export async function compressImage(file, { maxDim = 1600, quality = 0.72, minBytes = 500 * 1024 } = {}) {
  try {
    if (!file || !file.type || !COMPRESSIVEIS.includes(file.type)) return file;
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));

    // Já pequena e dentro da dimensão → não mexe
    if (scale >= 1 && file.size <= minBytes) { bitmap.close?.(); return file; }

    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // não ajudou → mantém original

    const name = file.name.replace(/\.(png|webp|jpe?g|heic|heif)$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file; // qualquer falha → envia o original
  }
}
