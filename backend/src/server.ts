/// <reference path="./@types/express.d.ts" />
import 'dotenv/config';
import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";

// --- Endpoint de Healthcheck ---
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});
// --- Fim do Healthcheck ---

import cron from "node-cron";
import { initIO } from "./libs/socket";
import logger from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import BullQueue from './libs/queue';
import { Op } from "sequelize";
import ContactList from "./models/ContactList";
import SyncContactListBySavedFilterService from "./services/ContactListService/SyncContactListBySavedFilterService";

import { startQueueProcess } from "./queues";
// import { ScheduledMessagesJob, ScheduleMessagesGenerateJob, ScheduleMessagesEnvioJob, ScheduleMessagesEnvioForaHorarioJob } from "./wbotScheduledMessages";

const server = app.listen(process.env.PORT, async () => {
  const companies = await Company.findAll({
    where: { status: true },
    attributes: ["id"]
  });

  const allPromises: any[] = [];
  companies.map(async c => {
    const promise = StartAllWhatsAppsSessions(c.id);
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(async () => {
    await startQueueProcess();
  });

  if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== '') {
    BullQueue.process();
  }

  logger.info(`Server started on port: ${process.env.PORT}`);
});

process.on("uncaughtException", err => {
  console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason, p) => {
  console.error(
    `${new Date().toUTCString()} unhandledRejection:`,
    reason,
    p
  );
});

// Cron diário para sincronizar listas com savedFilter (02:00 horário do servidor)
cron.schedule("0 4 * * *", async () => {
  try {
    logger.info("Iniciando sincronização diária de listas com savedFilter");
    const lists = await ContactList.findAll({
      where: { savedFilter: { [Op.ne]: null } },
      attributes: ["id", "companyId"]
    });
    for (const list of lists) {
      try {
        await SyncContactListBySavedFilterService({
          contactListId: (list as any).id,
          companyId: (list as any).companyId
        });
      } catch (err: any) {
        logger.error("Erro ao sincronizar lista", { id: (list as any).id, error: err.message });
      }
    }
    logger.info(`Sincronização diária concluída para ${lists.length} listas`);
  } catch (error: any) {
    logger.error("Erro no cron de sincronização de savedFilter", { message: error.message });
  }
});

initIO(server);
gracefulShutdown(server);
