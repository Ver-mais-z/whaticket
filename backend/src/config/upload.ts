import path from "path";
import multer from "multer";
import fs from "fs";
import { Request } from "express";
import Whatsapp from "../models/Whatsapp";
import { isEmpty, isNil } from "lodash";
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// Interface de Request estendido
interface UploadRequest extends Request {
  user?: {
    id: string;
    profile: string;
    companyId: number;
  };
  body: {
    typeArch: string;
    fileId: string;
  };
}

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: async function (req: UploadRequest, file, cb) {
      let companyId: number | undefined;

      // Verificação segura de usuário e companyId
      if (req.user?.companyId) {
        companyId = req.user.companyId;
      }

      // Se companyId não estiver disponível, buscar por token do Whatsapp
      if (!companyId) {
        try {
          const authHeader = req.headers.authorization;

          if (authHeader) {
            const [, token] = authHeader.split(" ");

            if (token) {
              const whatsapp = await Whatsapp.findOne({
                where: { token },
                attributes: ['companyId']
              });

              if (whatsapp?.companyId) {
                companyId = whatsapp.companyId;
              }
            }
          }
        } catch (error) {
          console.error("Erro ao buscar companyId:", error);
        }
      }

      // Validação final de companyId
      if (!companyId) {
        const err = new Error("Não foi possível determinar o companyId");
        return cb(err, null);
      }

      // Determinar pasta de destino
      const { typeArch, fileId } = req.body;
      let folder: string;

      switch (typeArch) {
        case "announcements":
          folder = path.resolve(publicFolder, typeArch);
          break;
        case "logo":
          folder = path.resolve(publicFolder);
          break;
        default:
          folder = path.resolve(
            publicFolder,
            `company${companyId}`,
            typeArch || '',
            fileId || ''
          );
      }

      // Criar pasta de forma segura
      try {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
        return cb(null, folder);
      } catch (error) {
        console.error("Erro ao criar pasta:", error);
        return cb(error as Error, null);
      }
    },
    filename(req: UploadRequest, file, cb) {
      const { typeArch } = req.body;

      // Função de sanitização de nome de arquivo
      const sanitizeFileName = (name: string) =>
        name.replace(/[/\s]/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '');

      // Geração do nome do arquivo
      const fileName = typeArch && typeArch !== "announcements"
        ? sanitizeFileName(file.originalname)
        : `${Date.now()}_${sanitizeFileName(file.originalname)}`;

      return cb(null, fileName);
    }
  }),

  // Limites de upload
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1 // Limitar para um arquivo por vez
  },

  // Filtro de arquivo com tratamento de erro
  fileFilter: (req: UploadRequest, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'image/webp'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo inválido: ${file.mimetype}`));
    }
  }
};
