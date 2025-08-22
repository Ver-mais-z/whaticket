import { getBackendUrl } from "../config";

export const getMediaUrl = (urlPicture) => {
  if (!urlPicture) return `${getBackendUrl()}/nopicture.png`;
  
  // O modelo Contact já retorna a URL completa no getter urlPicture
  // Então apenas retornamos como está
  return urlPicture;
};
