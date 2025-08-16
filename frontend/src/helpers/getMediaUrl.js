import { getBackendUrl } from "../config";

export const getMediaUrl = (urlPicture) => {
  if (!urlPicture) return null;
  
  // Se já é uma URL completa (http/https), retorna como está
  if (urlPicture.startsWith('http://') || urlPicture.startsWith('https://')) {
    return urlPicture;
  }
  
  // Se é um caminho relativo, constrói a URL completa
  const backendUrl = getBackendUrl();
  return `${backendUrl}${urlPicture}`;
};
