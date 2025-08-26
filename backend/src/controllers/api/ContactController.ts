import { Request, Response } from "express";

import FindAllContactService from "../../services/ContactServices/FindAllContactsServices";
import CreateOrUpdateContactServiceForImport from "../../services/ContactServices/CreateOrUpdateContactServiceForImport";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import AppError from "../../errors/AppError";
import * as Yup from "yup";

type IndexQuery = {
    companyId: number;
};

import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";

interface ContactData {
  name: string;
  number: string;
  email?: string;
  cpfCnpj?: string;
  representativeCode?: string;
  city?: string;
  instagram?: string;
  situation?: 'Ativo' | 'Inativo' | 'Suspenso' | 'Excluído';
  fantasyName?: string;
  foundationDate?: Date;
  creditLimit?: string;
  tags?: string;
}

export const show = async (req: Request, res:Response): Promise<Response> => {
   const { companyId } = req.body as IndexQuery;
   
   const contacts = await FindAllContactService({companyId});

   return res.json({count:contacts.length, contacts});
}

export const count = async (req: Request, res:Response): Promise<Response> => {
    const { companyId } = req.body as IndexQuery;
    
    const contacts = await FindAllContactService({companyId});
 
    return res.json({count:contacts.length}); 
 }

 export const sync = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.body as IndexQuery;
  const contactData = req.body as ContactData;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string().required(),
    email: Yup.string()
      .transform((value, originalValue) => {
        const v = typeof originalValue === 'string' ? originalValue.trim() : originalValue;
        return v === '' || v === undefined ? null : v;
      })
      .email()
      .nullable(),
    cpfCnpj: Yup.string().nullable(),
    representativeCode: Yup.string().nullable(),
    city: Yup.string().nullable(),
    instagram: Yup.string().nullable(),
    situation: Yup.string().oneOf(['Ativo', 'Inativo', 'Suspenso', 'Excluido']).nullable(),
    fantasyName: Yup.string().nullable(),
    foundationDate: Yup.date().nullable(),
    creditLimit: Yup.string()
      .transform((value, originalValue) => {
        const v = typeof originalValue === 'string' ? originalValue.trim() : originalValue;
        return v === '' || v === undefined ? null : v;
      })
      .nullable(),
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Normalização pós-validação: email como string vazia, creditLimit como null quando vazio
  if (Object.prototype.hasOwnProperty.call(contactData, 'email')) {
    if (contactData.email === null || contactData.email === undefined) {
      contactData.email = '' as any;
    } else if (typeof contactData.email === 'string') {
      contactData.email = contactData.email.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(contactData, 'creditLimit')) {
    if (typeof contactData.creditLimit === 'string' && contactData.creditLimit.trim() === '') {
      contactData.creditLimit = null as any;
    }
  }

  try {
    const contact = await CreateOrUpdateContactServiceForImport({
      ...contactData,
      companyId: companyId,
      isGroup: false,
      profilePicUrl: ""
    });

    if (contactData.tags) {
      const tagList = contactData.tags.split(',').map(tag => tag.trim());

      for (const tagName of tagList) {
        try {
          let [tag, created] = await Tag.findOrCreate({
            where: { name: tagName, companyId, color: "#A4CCCC", kanban: 0 }
          });

          await ContactTag.findOrCreate({
            where: {
              contactId: contact.id,
              tagId: tag.id
            }
          });
        } catch (error) {
          logger.info("Erro ao criar Tags", error)
        }
      }
    }

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });

    return res.status(200).json(contact);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
