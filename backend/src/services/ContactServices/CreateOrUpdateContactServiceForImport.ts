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

  // helper: normalize creditLimit to null when empty/whitespace
  const normalizeCreditLimit = (v: any): string | null => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    return String(v);
  };

  const contactData = {
    name,
    number,
    profilePicUrl,
    isGroup,
    email,
    commandBot,
    extraInfo,
    companyId,
    creditLimit: normalizeCreditLimit(creditLimit),
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
    // Proteção: não sobrescrever nome personalizado já válido
    const currentName = (contact.name || "").trim();
    const currentIsNumber = currentName.replace(/\D/g, "") === String(number);
    const hasValidExistingName = currentName !== "" && !currentIsNumber;

    const incomingName = (name || "").trim();
    const incomingIsNumber = incomingName.replace(/\D/g, "") === String(number);

    const updatePayload: any = {
      ...contactData,
      situation: situation || contact.situation,
      creditLimit: normalizeCreditLimit(creditLimit) ?? contact.creditLimit
    };

    if (hasValidExistingName) {
      // Não atualizar o campo name
      delete updatePayload.name;
    } else {
      // Atualiza apenas se vier um nome melhor que não seja número; senão mantém número
      updatePayload.name = incomingName && !incomingIsNumber ? incomingName : String(number);
    }

    await contact.update(updatePayload);

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

  // Chama o serviço centralizado para atualizar nome/avatar com proteção
  try {
    const RefreshContactAvatarService = (await import("./RefreshContactAvatarService")).default;
    await RefreshContactAvatarService({ contactId: contact.id, companyId });
  } catch (err) {
    console.warn("Falha ao atualizar avatar/nome centralizado", err);
  }

  return contact;
};

export default CreateOrUpdateContactServiceForImport;
