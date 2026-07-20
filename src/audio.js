import { config } from "./config.js";

function cleanRelativePath(relativePath) {
  return String(relativePath ?? "").replace(/^\/+/, "");
}

export function audioUrl(relativePath) {
  if (!config.audioBaseUrl || !relativePath) {
    return null;
  }

  return `${config.audioBaseUrl}/${cleanRelativePath(relativePath)}`;
}

export function audioAttachment(relativePath, name) {
  const attachment = audioUrl(relativePath);
  return attachment ? { attachment, name } : null;
}
