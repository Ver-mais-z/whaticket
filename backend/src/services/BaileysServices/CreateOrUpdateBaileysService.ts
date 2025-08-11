import { Chat, Contact } from "@whiskeysockets/baileys";
import Baileys from "../../models/Baileys";

interface Request {
  whatsappId: number;
  contacts?: Contact[];
  chats?: Chat[];
}

const createOrUpdateBaileysService = async ({
  whatsappId,
  contacts,
  chats,
}: Request): Promise<Baileys> => {

  try {
    const baileysExists = await Baileys.findOne({
      where: { whatsappId }
    });

    if (baileysExists) {
      let getChats: Chat[] = [];
      let getContacts: Contact[] = [];
    
      // Converte os chats existentes se a string estiver OK
      if (baileysExists.chats) {
        try {
          getChats = JSON.parse(baileysExists.chats);
        } catch (err) {
          console.warn(`Chats JSON inválido: ${baileysExists.chats}, substituindo por []`);
          getChats = [];
        }
      }
    
      // Converte os contatos existentes se a string estiver OK
      if (baileysExists.contacts) {
        try {
          getContacts = JSON.parse(baileysExists.contacts);
        } catch (err) {
          console.warn(`Contacts JSON inválido: ${baileysExists.contacts}, substituindo por []`);
          getContacts = [];
        }
      }
    
      // A partir daqui o fluxo continua como antes
      if (chats) {
        getChats.push(...chats);
        getChats.sort();
        const newChats = getChats.filter(
          (v: Chat, i: number, a: Chat[]) => a.findIndex(v2 => v2.id === v.id) === i
        );
        return await baileysExists.update({
          chats: JSON.stringify(newChats),
        });
      }
    
      if (contacts) {
        getContacts.push(...contacts);
        getContacts.sort();
        const newContacts = getContacts.filter(
          (v: Contact, i: number, a: Contact[]) => a.findIndex(v2 => v2.id === v.id) === i
        );
        return await baileysExists.update({
          contacts: JSON.stringify(newContacts),
        });
      }
    }
    

    const baileys = await Baileys.create({
      whatsappId,
      contacts: JSON.stringify(contacts),
      chats: JSON.stringify(chats)
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    return baileys;
  } catch (error) {
    console.log(error, whatsappId, contacts);
    throw new Error(error);
  }
};

export default createOrUpdateBaileysService;