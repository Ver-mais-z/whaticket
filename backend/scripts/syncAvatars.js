// Script JavaScript simples para sincronizar avatares
// Rode com: node backend/scripts/syncAvatars.js

const path = require("path");
const dotenv = require("dotenv");
const { Op } = require("sequelize");

// Configure as variáveis de ambiente
console.log("Configurando variáveis de ambiente...");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log("Variáveis de ambiente configuradas.");

// Importar banco de dados já configurado
console.log("Carregando models do banco de dados...");
const db = require("../dist/database");
console.log("Models carregados.");

// Obter os models que precisamos
const ContactListItem = db.models.ContactListItem;
const Contact = db.models.Contact;

if (!ContactListItem || !Contact) {
  console.error("Erro: Models não encontrados!");
  process.exit(1);
}

async function main() {
  try {
    console.log("Inicializando sincronização de avatares...");
    
    // Parâmetros de busca
    const args = process.argv.slice(2);
    const companyId = args[0] ? parseInt(args[0]) : undefined;
    const contactListId = args[1] ? parseInt(args[1]) : undefined;

    // Verifica se os parâmetros foram fornecidos
    if (companyId) {
      console.log(`Sincronizando avatares para a empresa ID: ${companyId}`);
    }
    if (contactListId) {
      console.log(`Sincronizando avatares para a lista de contatos ID: ${contactListId}`);
    }

    // Construindo o where para a query
    const where = {
      [Op.or]: [
        { urlPicture: null },
        { urlPicture: "" }
      ]
    };

    // Adicionar filtros se fornecidos
    if (companyId) {
      where.companyId = companyId;
    }
    
    if (contactListId) {
      where.contactListId = contactListId;
    }

    // Buscar todos os itens da lista de contatos sem avatar
    console.log("Buscando ContactListItems sem avatar...");
    const contactListItems = await ContactListItem.findAll({ where });
    console.log(`Encontrados ${contactListItems.length} ContactListItems sem avatar.`);

    // Processar cada item e sincronizar o avatar
    let atualizados = 0;
    for (const contactListItem of contactListItems) {
      // Buscar o contato correspondente pelo número
      const contact = await Contact.findOne({
        where: { 
          number: contactListItem.number, 
          companyId: contactListItem.companyId 
        },
        attributes: ["urlPicture"]
      });

      // Se encontrou o contato e ele tem avatar, atualizar o ContactListItem
      if (contact && contact.getDataValue("urlPicture")) {
        await contactListItem.update({ 
          urlPicture: contact.getDataValue("urlPicture") 
        });
        atualizados++;
        if (atualizados % 100 === 0) {
          console.log(`${atualizados} avatares sincronizados...`);
        }
      }
    }

    console.log(`Sincronização concluída! ${atualizados} avatares foram atualizados.`);
  } catch (error) {
    console.error("Erro na sincronização de avatares:", error);
    process.exit(1);
  }
}

// Executar função principal
main();
