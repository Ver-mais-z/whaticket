import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import * as fs from "fs";
import * as path from "path";
import * as Sentry from "@sentry/node";

import logger from "../../utils/logger";
import Contact from "../../models/Contact";
import { getIO } from "../../libs/socket";
import { getWbot } from "../../libs/wbot";
import axios from "axios";

interface Request {
  contactId: number | string;
  companyId: number;
  whatsappId?: number;
}

const ensureContactsFolder = (companyId: number) => {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }
  return folder;
};

const downloadProfileImage = async (profilePicUrl: string, folder: string, filename: string) => {
  try {
    const response = await axios.get(profilePicUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(join(folder, filename), response.data);
    return filename;
  } catch (error) {
    logger.warn("Falha ao baixar imagem de perfil", error);
    return null;
  }
};

const buildAvatarFilename = (contact: Contact) => {
  const base = contact.number ? String(contact.number).replace(/\D/g, "") : String(contact.id);
  const prefix = contact.isGroup ? "group-" : "";
  return `${prefix}${base}.jpeg`;
};

const RefreshContactAvatarService = async ({ contactId, companyId, whatsappId }: Request): Promise<Contact | null> => {
  try {
    const contact = await Contact.findOne({
      where: { id: contactId },
      attributes: [
        "id",
        "companyId",
        "name",
        "number",
        "isGroup",
        "channel",
        "remoteJid",
        "whatsappId",
        "profilePicUrl",
        "urlPicture"
      ]
    });

    if (!contact || contact.companyId !== companyId) return contact;

    const folder = ensureContactsFolder(companyId);

    const rawFilename = contact.getDataValue("urlPicture") as string | null;
    const filePath = rawFilename ? path.join(folder, rawFilename) : null;
    const fileExists = filePath ? fs.existsSync(filePath) : false;

    const desiredFilename = buildAvatarFilename(contact);
    const desiredPath = path.join(folder, desiredFilename);
    const desiredExists = fs.existsSync(desiredPath);

    let newProfileUrl = contact.profilePicUrl;

    const resolvedWhatsappId = contact.whatsappId || whatsappId;
    logger.info({
      contactId: contact.id,
      contactNumber: contact.number,
      companyId,
      channel: contact.channel,
      contactWhatsappId: contact.whatsappId,
      overrideWhatsappId: whatsappId,
      resolvedWhatsappId,
      hasFile: fileExists || desiredExists,
      rawFilename,
      desiredFilename,
      currentProfilePicUrl: contact.profilePicUrl,
      currentUrlPicture: contact.getDataValue("urlPicture")
    }, "[RefreshAvatar] start");

    if (contact.channel === "whatsapp" && resolvedWhatsappId) {
      try {
        const wbot = getWbot(resolvedWhatsappId);
        const jid = contact.remoteJid
          ? contact.remoteJid
          : contact.isGroup
            ? `${contact.number}@g.us`
            : `${contact.number}@s.whatsapp.net`;
        newProfileUrl = await wbot.profilePictureUrl(jid, "image");
      } catch (e) {
        Sentry.captureException(e);
        newProfileUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }
    } else if (contact.profilePicUrl) {
      // Para outros canais (facebook/instagram), se já houver uma URL e não houver arquivo local, baixa.
      newProfileUrl = contact.profilePicUrl;
    }

    let shouldRedownload = !desiredExists || !rawFilename || newProfileUrl !== contact.profilePicUrl;

    // Não substituir por fallback se já existe uma imagem local válida
    const fallbackUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    if (newProfileUrl === fallbackUrl && (desiredExists || fileExists)) {
      shouldRedownload = false;
    }

    // Se o arquivo salvo tem nome diferente do desejado, força redownload para corrigir
    if (rawFilename && rawFilename !== desiredFilename) {
      logger.info({
        contactId: contact.id,
        rawFilename,
        desiredFilename,
        action: "forcing_redownload"
      }, "[RefreshAvatar] forçando redownload para corrigir nome do arquivo");
      
      // Remove arquivo antigo se existir
      if (fileExists) {
        try {
          fs.unlinkSync(filePath as string);
          logger.info({
            contactId: contact.id,
            removed: rawFilename
          }, "[RefreshAvatar] arquivo antigo removido");
        } catch (e) {
          logger.warn({
            contactId: contact.id,
            error: e.message
          }, "[RefreshAvatar] falha ao remover arquivo antigo");
        }
      }
      
      // Remove arquivo desejado se existir para garantir download fresco
      if (desiredExists) {
        try {
          fs.unlinkSync(desiredPath);
          logger.info({
            contactId: contact.id,
            removed: desiredFilename
          }, "[RefreshAvatar] arquivo desejado removido para download fresco");
        } catch (e) {
          logger.warn({
            contactId: contact.id,
            error: e.message
          }, "[RefreshAvatar] falha ao remover arquivo desejado");
        }
      }
      
      // Força redownload
      shouldRedownload = true;
    }

    if (newProfileUrl && shouldRedownload) {
      logger.info("[RefreshAvatar] downloading new avatar", {
        contactId: contact.id,
        newProfileUrl,
        reason: {
          fileExists: desiredExists,
          rawFilename: desiredFilename,
          urlChanged: newProfileUrl !== contact.profilePicUrl
        }
      });
      const filename = await downloadProfileImage(newProfileUrl, folder, desiredFilename);
      if (filename) {
        logger.info("[RefreshAvatar] updating contact in database", {
          contactId: contact.id,
          filename,
          newProfileUrl
        });
        
        await contact.update({ profilePicUrl: newProfileUrl, urlPicture: filename, pictureUpdated: true });
        await contact.reload();
        
        logger.info("[RefreshAvatar] contact updated, current urlPicture", {
          contactId: contact.id,
          urlPicture: contact.getDataValue("urlPicture"),
          urlPictureGetter: contact.urlPicture
        });
        
        // Emite evento Socket.IO para atualização em tempo real
        const io = getIO();
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
          action: "update",
          contact: {
            id: contact.id,
            name: contact.name,
            urlPicture: contact.urlPicture,
            updatedAt: contact.updatedAt
          }
        });
        
        logger.info("[RefreshAvatar] avatar updated and event emitted", {
          contactId: contact.id,
          filename
        });
      } else {
        logger.warn("[RefreshAvatar] failed to download image", {
          contactId: contact.id,
          newProfileUrl
        });
      }
    }

    logger.info({
      contactId: contact.id,
      finalUrlPicture: contact.getDataValue("urlPicture"),
      finalUrlPictureGetter: contact.urlPicture
    }, "[RefreshAvatar] final result");
    
    return contact;
  } catch (err) {
    Sentry.captureException(err);
    logger.error("Erro ao atualizar avatar do contato", err);
    return null;
  }
};

export default RefreshContactAvatarService;
