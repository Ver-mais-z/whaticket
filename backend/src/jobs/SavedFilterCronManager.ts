import cron, { ScheduledTask } from "node-cron";
import { Op } from "sequelize";
import logger from "../utils/logger";
import ContactList from "../models/ContactList";
import SyncContactListBySavedFilterService from "../services/ContactListService/SyncContactListBySavedFilterService";
import GetSettingService from "../services/SettingServices/GetSettingService";
import UpdateOneSettingService from "../services/SettingServices/UpdateOneSettingService";

let task: ScheduledTask | null = null;
let currentExpr = "";
let currentTz = "";

export const runSavedFilterSync = async () => {
  try {
    logger.info("Iniciando sincronização diária de listas com savedFilter");
    const lists = await ContactList.findAll({
      where: { savedFilter: { [Op.ne]: null } },
      attributes: ["id", "companyId"],
    });
    for (const list of lists) {
      try {
        await SyncContactListBySavedFilterService({
          contactListId: (list as any).id,
          companyId: (list as any).companyId,
        });
      } catch (err: any) {
        logger.error("Erro ao sincronizar lista", { id: (list as any).id, error: err.message });
      }
    }
    logger.info(`Sincronização diária concluída para ${lists.length} listas`);
  } catch (error: any) {
    logger.error("Erro no cron de sincronização de savedFilter", { message: error.message });
  }
};

function schedule(expr: string, tz: string) {
  if (task) {
    try { task.stop(); } catch {}
    task = null;
  }
  currentExpr = expr;
  currentTz = tz;
  logger.info(`Cron de savedFilter configurado: expr="${expr}", tz="${tz}"`);
  task = cron.schedule(expr, async () => {
    await runSavedFilterSync();
  }, { timezone: tz });
}

async function readConfigFromSettingsOrEnv(): Promise<{ expr: string; tz: string; }> {
  const envExpr = process.env.SAVED_FILTER_CRON || "0 2 * * *";
  const envTz = process.env.SAVED_FILTER_TZ || "America/Sao_Paulo";

  try {
    const exprSetting = await GetSettingService({ key: "SAVED_FILTER_CRON" });
    const tzSetting = await GetSettingService({ key: "SAVED_FILTER_TZ" });
    const expr = (exprSetting?.value || envExpr).trim();
    const tz = (tzSetting?.value || envTz).trim();
    return { expr, tz };
  } catch {
    return { expr: envExpr, tz: envTz };
  }
}

export async function initSavedFilterCron() {
  const { expr, tz } = await readConfigFromSettingsOrEnv();
  schedule(expr, tz);
}

export async function rescheduleSavedFilterCron(expr?: string, tz?: string) {
  // se não informados, lê dos settings/ambiente
  if (!expr || !tz) {
    const cfg = await readConfigFromSettingsOrEnv();
    expr = expr || cfg.expr;
    tz = tz || cfg.tz;
  }
  schedule(expr!, tz!);
}

export async function updateCronSettingsAndReschedule(expr: string, tz: string) {
  await UpdateOneSettingService({ key: "SAVED_FILTER_CRON", value: expr });
  await UpdateOneSettingService({ key: "SAVED_FILTER_TZ", value: tz });
  await rescheduleSavedFilterCron(expr, tz);
}

export function getActiveSavedFilterCronConfig() {
  return { expr: currentExpr, tz: currentTz };
}
