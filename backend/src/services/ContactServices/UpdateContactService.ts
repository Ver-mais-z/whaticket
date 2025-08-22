import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactWallet from "../../models/ContactWallet";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}

interface Wallet {
  walletId: number | string;
  contactId: number | string;
  companyId: number | string;
}

interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  acceptAudioMessage?: boolean;
  active?: boolean;
  extraInfo?: ExtraInfo[];
  disableBot?: boolean;
  remoteJid?: string;
  wallets?: null | number[] | string[];

  // Novos campos
  cpfCnpj?: string;
  representativeCode?: string;
  city?: string;
  instagram?: string;
  situation?: 'Ativo' | 'Inativo' | 'Suspenso' | 'Excluído';
  fantasyName?: string;
  foundationDate?: Date;
  creditLimit?: string;
}

interface Request {
  contactData: ContactData;
  contactId: string;
  companyId: number;
  userId?: number;
}

const UpdateContactService = async ({
                                      contactData,
                                      contactId,
                                      companyId,
                                      userId
                                    }: Request): Promise<Contact> => {
  const {
    email,
    name,
    number,
    extraInfo,
    acceptAudioMessage,
    active,
    disableBot,
    remoteJid,
    wallets,
    // Novos campos
    cpfCnpj,
    representativeCode,
    city,
    instagram,
    situation,
    fantasyName,
    foundationDate,
    creditLimit
  } = contactData;

  const sanitizedCreditLimit = creditLimit !== undefined ? creditLimit : null;

  // Validação de CPF/CNPJ
  if (cpfCnpj) {
    const cleanDoc = cpfCnpj.replace(/\D/g, '');
    if (![11, 14].includes(cleanDoc.length)) {
      throw new AppError("CPF/CNPJ inválido");
    }
  }

  // Validação da data de fundação
  let foundationDateValue: Date | null = null;
  if (contactData.foundationDate && typeof contactData.foundationDate === 'string' && contactData.foundationDate !== '') {
    const date = new Date(contactData.foundationDate);
    if (isNaN(date.getTime())) {
      throw new AppError("INVALID_FOUNDATION_DATE");
    } else {
      foundationDateValue = date;
    }
  }

  // Converter string vazia para null para foundationDate
  if (typeof contactData.foundationDate === 'string' && contactData.foundationDate === '') {
    foundationDateValue = null;
  }

  const contact = await Contact.findOne({
    where: { id: contactId },
    attributes: [
      "id", "name", "number", "channel", "email", "companyId",
      "acceptAudioMessage", "active", "profilePicUrl", "remoteJid",
      "urlPicture",
      // Adicionar novos campos aos atributos
      "cpfCnpj", "representativeCode", "city", "instagram",
      "situation", "fantasyName", "foundationDate", "creditLimit"
    ],
    include: ["extraInfo", "tags",
      {
        association: "wallets",
        attributes: ["id", "name"]
      }]
  });

  if (contact?.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (extraInfo) {
    await Promise.all(
      extraInfo.map(async (info: any) => {
        await ContactCustomField.upsert({ ...info, contactId: contact.id });
      })
    );

    await Promise.all(
      contact.extraInfo.map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);

        if (stillExists === -1) {
          await ContactCustomField.destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }

  if (wallets) {
    await ContactWallet.destroy({
      where: {
        companyId,
        contactId
      }
    });

    const contactWallets: Wallet[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wallets.forEach((wallet: any) => {
      contactWallets.push({
        walletId: !wallet.id ? wallet : wallet.id,
        contactId,
        companyId
      });
    });

    await ContactWallet.bulkCreate(contactWallets);
  }

  // Função auxiliar para converter strings vazias em null
  const emptyToNull = (value: any) => {
    if (value === undefined) return null;
    return value === '' ? '' : value;
  };

  // Proteção de nome: preservar nome personalizado já válido
  const currentName = (contact.name || "").trim();
  const currentIsNumber = currentName.replace(/\D/g, "") === String(contact.number);
  const hasValidExistingName = currentName !== "" && !currentIsNumber;

  let resolvedName = contact.name;
  if (name === undefined) {
    resolvedName = contact.name; // sem alteração do campo name
  } else {
    const incomingName = (name || "").trim();
    const incomingIsNumber = incomingName.replace(/\D/g, "") === String(number ?? contact.number);

    if (hasValidExistingName) {
      // Só aceitar alteração se o novo nome for explicitamente válido (não vazio e não igual ao número)
      if (incomingName && !incomingIsNumber) {
        resolvedName = incomingName;
      } else {
        resolvedName = contact.name; // ignora tentativa inválida
      }
    } else {
      // Nome atual é vazio ou igual ao número: aceitar um nome melhor, senão manter número
      resolvedName = incomingName && !incomingIsNumber ? incomingName : String(number ?? contact.number);
    }
  }

  const updateData: any = {
    name: resolvedName,
    number: number !== undefined ? number : contact.number,
    email: email !== undefined ? emptyToNull(email) : contact.email,
    acceptAudioMessage: acceptAudioMessage !== undefined ? acceptAudioMessage : contact.acceptAudioMessage,
    active: active !== undefined ? active : contact.active,
    disableBot: disableBot !== undefined ? disableBot : contact.disableBot,
    remoteJid: remoteJid !== undefined ? remoteJid : contact.remoteJid,
    
    // Novos campos com tratamento para valores vazios
    cpfCnpj: cpfCnpj !== undefined ? emptyToNull(cpfCnpj) : contact.cpfCnpj,
    representativeCode: representativeCode !== undefined ? emptyToNull(representativeCode) : contact.representativeCode,
    city: city !== undefined ? emptyToNull(city) : contact.city,
    instagram: instagram !== undefined ? emptyToNull(instagram) : contact.instagram,
    situation: situation !== undefined ? situation : contact.situation || 'Ativo',
    fantasyName: fantasyName !== undefined ? emptyToNull(fantasyName) : contact.fantasyName,
    foundationDate: foundationDateValue,
    creditLimit: creditLimit !== undefined ? emptyToNull(creditLimit) : contact.creditLimit,
  };

  // Apenas atualiza o userId se ele for fornecido
  if (userId) {
    updateData.userId = userId;
  }

  await contact.update(updateData);

  // Chama o serviço centralizado para atualizar nome/avatar com proteção
  try {
    const RefreshContactAvatarService = (await import("./RefreshContactAvatarService")).default;
    await RefreshContactAvatarService({ contactId: contact.id, companyId });
  } catch (err) {
    console.warn("Falha ao atualizar avatar/nome centralizado", err);
  }

  await contact.reload({
    attributes: [
      "id", "name", "number", "channel", "email", "companyId",
      "acceptAudioMessage", "active", "profilePicUrl", "remoteJid",
      "urlPicture",
      // Adicionar novos campos aos atributos
      "cpfCnpj", "representativeCode", "city", "instagram",
      "situation", "fantasyName", "foundationDate", "creditLimit"
    ],
    include: ["extraInfo", "tags",
      {
        association: "wallets",
        attributes: ["id", "name"]
      }]
  });

  return contact;
};

export default UpdateContactService;
