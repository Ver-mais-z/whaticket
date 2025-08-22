import fs from "fs";
import path from "path";
import Contact from "../src/models/Contact";
import Company from "../src/models/Company";
import logger from "../src/utils/logger";

interface ContactData {
  id: number;
  name: string;
  number: string;
  urlPicture: string | null;
  companyId: number;
}

const fixMissingAvatars = async (companyId?: number) => {
  try {
    logger.info("[FixMissingAvatars] Iniciando correção de avatares ausentes");

    const { Op } = require("sequelize");
    
    const whereClause: any = {
      urlPicture: {
        [Op.ne]: null
      }
    };
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    const contacts = await Contact.findAll({
      where: whereClause,
      attributes: ["id", "name", "number", "urlPicture", "companyId"]
    }) as ContactData[];

    logger.info(`[FixMissingAvatars] Encontrados ${contacts.length} contatos com urlPicture`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const contact of contacts) {
      try {
        if (!contact.urlPicture) continue;

        const publicFolder = path.resolve(__dirname, "..", "public");
        const contactsFolder = path.resolve(publicFolder, `company${contact.companyId}`, "contacts");
        const filePath = path.join(contactsFolder, contact.urlPicture);

        // Verifica se o arquivo existe
        if (!fs.existsSync(filePath)) {
          // Verifica se é uma URL externa (não deve ser removida)
          if (contact.urlPicture.startsWith('http://') || contact.urlPicture.startsWith('https://')) {
            logger.info(`[FixMissingAvatars] URL externa mantida: ${contact.urlPicture} para contato ${contact.id}`);
            continue;
          }

          logger.warn(`[FixMissingAvatars] Arquivo não encontrado: ${contact.urlPicture} para contato ${contact.id} (${contact.name})`);
          
          // Remove a referência do banco de dados apenas se for arquivo local
          await Contact.update(
            { 
              urlPicture: null,
              pictureUpdated: false 
            },
            { where: { id: contact.id } }
          );

          fixedCount++;
          logger.info(`[FixMissingAvatars] Referência removida para contato ${contact.id}`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`[FixMissingAvatars] Erro ao processar contato ${contact.id}:`, error);
      }
    }

    logger.info(`[FixMissingAvatars] Concluído! Corrigidos: ${fixedCount}, Erros: ${errorCount}`);
    
    return {
      processed: contacts.length,
      fixed: fixedCount,
      errors: errorCount
    };

  } catch (error) {
    logger.error("[FixMissingAvatars] Erro geral:", error);
    throw error;
  }
};

// Execução do script
const main = async () => {
  const companyId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  
  if (companyId) {
    logger.info(`[FixMissingAvatars] Executando para empresa ${companyId}`);
  } else {
    logger.info("[FixMissingAvatars] Executando para todas as empresas");
  }

  try {
    const result = await fixMissingAvatars(companyId);
    console.log("Resultado:", result);
    process.exit(0);
  } catch (error) {
    console.error("Erro:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

export default fixMissingAvatars;
