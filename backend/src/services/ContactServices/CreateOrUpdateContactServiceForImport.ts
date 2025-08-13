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
  situation?: 'Ativo' | 'Inativo' | 'Suspenso' | 'Excluído';
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
  creditLimit,
  cpfCnpj,
  representativeCode,
  city,
  instagram,
  situation,
  fantasyName,
  foundationDate
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  // Convert Excel serial date to JS Date object
  let finalFoundationDate = foundationDate;
  if (typeof foundationDate === 'number' && foundationDate > 0) {
    // Formula to convert Excel serial number for dates (starting from 1900) to JS Date
    const date = new Date((foundationDate - 25569) * 86400 * 1000);
    finalFoundationDate = date;
  }

  const contactData = {
    name,
    number,
    profilePicUrl,
    isGroup,
    email,
    commandBot,
    extraInfo,
    companyId,
    creditLimit: creditLimit ? String(creditLimit) : "",
    cpfCnpj: cpfCnpj ? String(cpfCnpj) : undefined,
    representativeCode: representativeCode ? String(representativeCode) : undefined,
    city,
    instagram,
    situation: situation || 'Ativo',
    fantasyName,
    foundationDate: finalFoundationDate
  };

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({ where: { number, companyId } });

  if (contact) {
    await contact.update({
      ...contactData,
      situation: situation || contact.situation,
      creditLimit: creditLimit ? String(creditLimit) : contact.creditLimit
    });

    io.of(String(companyId))
      .emit(`company-${companyId}-contact`, {
        action: "update",
        contact
      });
  } else {
    contact = await Contact.create(contactData);

    io.of(String(companyId))
      .emit(`company-${companyId}-contact`, {
        action: "create",
        contact
      });
  }

  return contact;
};

export default CreateOrUpdateContactServiceForImport;
