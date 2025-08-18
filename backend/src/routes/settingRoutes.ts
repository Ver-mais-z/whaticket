import { Router } from "express";
import isAuth from "../middleware/isAuth";
import envTokenAuth from "../middleware/envTokenAuth";
import multer from "multer";

import * as SettingController from "../controllers/SettingController";
import isSuper from "../middleware/isSuper";
import uploadConfig from "../config/upload";
import uploadPrivateConfig from "../config/privateFiles";

const upload = multer(uploadConfig);
const uploadPrivate = multer(uploadPrivateConfig);

const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, SettingController.index);
// SavedFilter Cron Config (específico) - definir ANTES de '/settings/:settingKey'
settingRoutes.get("/settings/saved-filter-cron", isAuth, SettingController.getSavedFilterCronConfig);
settingRoutes.put("/settings/saved-filter-cron", isAuth, SettingController.updateSavedFilterCronConfig);

settingRoutes.get("/settings/:settingKey", isAuth, SettingController.showOne);

// change setting key to key in future
settingRoutes.put("/settings/:settingKey", isAuth, SettingController.update);

settingRoutes.get("/setting/:settingKey", isAuth, SettingController.getSetting);

settingRoutes.put("/setting/:settingKey", isAuth, SettingController.updateOne);

settingRoutes.get("/public-settings/:settingKey", envTokenAuth, SettingController.publicShow);

settingRoutes.post("/settings-whitelabel/logo", isAuth, upload.single("file"), SettingController.storeLogo);

settingRoutes.post(
  "/settings/privateFile",
  isAuth,
  uploadPrivate.single("file"),
  SettingController.storePrivateFile
)

export default settingRoutes;
