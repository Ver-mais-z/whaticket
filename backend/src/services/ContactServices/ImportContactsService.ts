import { head } from "lodash";
import XLSX from "xlsx";
import { has } from "lodash";
import ContactListItem from "../../models/ContactListItem";
import CheckContactNumber from "../WbotServices/CheckNumber";
import logger from "../../utils/logger";
import Contact from "../../models/Contact";
// import CheckContactNumber from "../WbotServices/CheckNumber";

export async function ImportContactsService(
  companyId: number,
  file: Express.Multer.File | undefined
) {
  const workbook = XLSX.readFile(file?.path as string);
  const worksheet = head(Object.values(workbook.Sheets)) as any;
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 0 });

  const contacts = rows.map(row => {
    let name = "";
    let number = "";
    let email = "";
    let cpfCnpj = "";
    let representativeCode = "";
    let city = "";
    let instagram = "";
    let situation = "";
    let fantasyName = "";
    let foundationDate = null;
    let creditLimit = "";

    if (has(row, "cpfCnpj") || has(row, "CPF/CNPJ") || has(row, "cpf") || has(row, "CPF")) {
      cpfCnpj = row["cpfCnpj"] || row["CPF/CNPJ"] || row["cpf"] || row["CPF"];
    }

    if (has(row, "representativeCode") || has(row, "Código do Representante")) {
      representativeCode = row["representativeCode"] || row["Código do Representante"];
    }

    if (has(row, "city") || has(row, "Cidade")) {
      city = row["city"] || row["Cidade"];
    }

    if (has(row, "instagram") || has(row, "Instagram")) {
      instagram = row["instagram"] || row["Instagram"];
    }

    if (has(row, "situation") || has(row, "Situação")) {
      situation = row["situation"] || row["Situação"];
    }

    if (has(row, "fantasyName") || has(row, "Nome Fantasia")) {
      fantasyName = row["fantasyName"] || row["Nome Fantasia"];
    }

    if (has(row, "foundationDate") || has(row, "Data de Fundação")) {
      foundationDate = row["foundationDate"] || row["Data de Fundação"];
    }

    if (has(row, "creditLimit") || has(row, "Limite de Crédito")) {
      creditLimit = row["creditLimit"] || row["Limite de Crédito"];
    }

    if (has(row, "nome") || has(row, "Nome")) {
      name = row["nome"] || row["Nome"];
    }

    if (
      has(row, "numero") ||
      has(row, "número") ||
      has(row, "Numero") ||
      has(row, "Número")
    ) {
      number = row["numero"] || row["número"] || row["Numero"] || row["Número"];
      number = `${number}`.replace(/\D/g, "");
    }

    if (
      has(row, "email") ||
      has(row, "e-mail") ||
      has(row, "Email") ||
      has(row, "E-mail")
    ) {
      email = row["email"] || row["e-mail"] || row["Email"] || row["E-mail"];
    }

    return {
      name,
      number,
      email,
      cpfCnpj,
      representativeCode,
      city,
      instagram,
      situation,
      fantasyName,
      foundationDate,
      creditLimit,
      companyId
    };
  });


  const contactList: Contact[] = [];

  for (const contact of contacts) {
    const [newContact, created] = await Contact.findOrCreate({
      where: {
        number: `${contact.number}`,
        companyId: contact.companyId
      },
      defaults: contact
    });
    if (created) {
      contactList.push(newContact);
    }
  }

  // Verifica se existe os contatos
  // if (contactList) {
  //   for (let newContact of contactList) {
  //     try {
  //       const response = await CheckContactNumber(newContact.number, companyId);
  //       const number = response;
  //       newContact.number = number;
  //       console.log('number', number)
  //       await newContact.save();
  //     } catch (e) {
  //       logger.error(`Número de contato inválido: ${newContact.number}`);
  //     }
  //   }
  // }

  return contactList;
}
