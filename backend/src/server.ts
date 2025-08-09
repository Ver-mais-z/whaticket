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

// Exemplo de como ficariam seus cron jobs, se quiser ativar depois:
// cron.schedule("* * * * * *", async () => {
//   try {
//     await ScheduledMessagesJob();
//     await ScheduleMessagesGenerateJob();
//   } catch (error) {
//     logger.error(error);
//   }
// });

// cron.schedule("* * * * * *", async () => {
//   try {
//     await ScheduleMessagesEnvioJob();
//     await ScheduleMessagesEnvioForaHorarioJob()
//   } catch (error) {
//     logger.error(error);
//   }
// });

initIO(server);
gracefulShutdown(server);
