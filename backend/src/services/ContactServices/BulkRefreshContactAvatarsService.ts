import logger from "../../utils/logger";
import Contact from "../../models/Contact";
import RefreshContactAvatarService from "./RefreshContactAvatarService";

interface Request {
  companyId: number;
  contactIds?: number[];
  limit?: number;
}

const BulkRefreshContactAvatarsService = async ({ 
  companyId, 
  contactIds, 
  limit = 50 
}: Request): Promise<void> => {
  try {
    logger.info({
      companyId,
      contactIds: contactIds?.length || "all",
      limit
    }, "[BulkRefreshAvatars] iniciando atualização em lote");

    const whereClause: any = { companyId };
    if (contactIds && contactIds.length > 0) {
      whereClause.id = contactIds;
    }

    const contacts = await Contact.findAll({
      where: whereClause,
      limit,
      order: [['updatedAt', 'ASC']] // Prioriza contatos mais antigos
    });

    logger.info({
      companyId,
      contactsFound: contacts.length
    }, "[BulkRefreshAvatars] contatos encontrados");

    // Processa contatos em paralelo (máximo 5 por vez para não sobrecarregar)
    const batchSize = 5;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (contact) => {
          try {
            await RefreshContactAvatarService({
              contactId: contact.id,
              companyId,
              whatsappId: contact.whatsappId
            });
          } catch (error) {
            logger.warn({
              contactId: contact.id,
              error: error.message
            }, "[BulkRefreshAvatars] erro ao atualizar avatar do contato");
          }
        })
      );

      // Pequena pausa entre lotes para não sobrecarregar
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info({
      companyId,
      processedContacts: contacts.length
    }, "[BulkRefreshAvatars] atualização em lote concluída");

  } catch (error) {
    logger.error({
      companyId,
      error: error.message
    }, "[BulkRefreshAvatars] erro na atualização em lote");
    throw error;
  }
};

export default BulkRefreshContactAvatarsService;
