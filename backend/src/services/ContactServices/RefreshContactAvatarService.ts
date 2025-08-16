import * as Sentry from "@sentry/node";
import fs from "fs";
import path, { join } from "path";
import Contact from "../../models/Contact";
import { getWbot } from "../../libs/wbot";
import logger from "../../utils/logger";

const axios = require("axios");

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
    logger.info("[RefreshAvatar] start", {
      contactId: contact.id,
      companyId,
      channel: contact.channel,
      contactWhatsappId: contact.whatsappId,
      overrideWhatsappId: whatsappId,
      resolvedWhatsappId,
      hasFile: fileExists || desiredExists,
      rawFilename,
      currentProfilePicUrl: contact.profilePicUrl
    });

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

    // Se o arquivo salvo anteriormente tem um nome diferente do nome estável desejado,
    // tente renomeá-lo para evitar duplicatas.
    if (!shouldRedownload && rawFilename && rawFilename !== desiredFilename && fileExists) {
      try {
        if (!desiredExists) {
          fs.renameSync(filePath as string, desiredPath);
          await contact.update({ urlPicture: desiredFilename });
          await contact.reload();
          logger.info("[RefreshAvatar] arquivo renomeado para nome estável", {
            contactId: contact.id,
            from: rawFilename,
            to: desiredFilename
          });
        } else {
          // Já existe o arquivo com nome estável e também o antigo: remove o antigo para evitar duplicatas
          fs.unlinkSync(filePath as string);
          logger.info("[RefreshAvatar] arquivo antigo removido (duplicado)", {
            contactId: contact.id,
            removed: rawFilename,
            kept: desiredFilename
          });
        }
      } catch (e) {
        logger.warn("[RefreshAvatar] falha ao ajustar arquivos de avatar (rename/cleanup)", e);
      }
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
        await contact.update({ profilePicUrl: newProfileUrl, urlPicture: filename, pictureUpdated: true });
        await contact.reload();
        logger.info("[RefreshAvatar] avatar updated", {
          contactId: contact.id,
          filename
        });
      }
    }

    return contact;
  } catch (err) {
    Sentry.captureException(err);
    logger.error("Erro ao atualizar avatar do contato", err);
    return null;
  }
};

export default RefreshContactAvatarService;
