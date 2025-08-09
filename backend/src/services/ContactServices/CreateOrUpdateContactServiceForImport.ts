import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  commandBot?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  companyId: number;
  creditLimit?: string;
  cpfCnpj?: string;
  representativeCode?: string;
  city?: string;
  instagram?: string;
  situation?: 'Ativo' | 'Inativo' | 'Suspenso';
  fantasyName?: string;
  foundationDate?: Date;
}

const CreateOrUpdateContactServiceForImport = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  commandBot = "",
  extraInfo = [], 
  companyId,
  creditLimit = "",
  cpfCnpj,
  representativeCode,
  city,
  instagram,
  situation,
  fantasyName,
  foundationDate
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({ where: { number , companyId } });

  if (contact) {
    const updateData: any = { 
      name, 
      profilePicUrl,
      cpfCnpj,
      representativeCode,
      city,
      instagram,
      situation: situation || contact.situation,
      fantasyName,
      foundationDate,
      creditLimit: creditLimit || contact.creditLimit
    };
    
    if (contact.companyId === null) {
      updateData.companyId = companyId;
    }
    
    await contact.update(updateData);

      io.of(String(companyId))
  .emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });
  } else {
    contact = await Contact.create({
      name,
      companyId,
      number,
      profilePicUrl,
      email,
      commandBot,
      isGroup,
      extraInfo,
      creditLimit,
      cpfCnpj,
      representativeCode,
      city,
      instagram,
      situation: situation || 'Ativo',
      fantasyName,
      foundationDate
    });

    io.of(String(companyId))
  .emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactServiceForImport;
