// Script para ser usado no console interativo do Node.js
// Rode com: cd backend && node -e "require('./scripts/syncConsole.js')"

const { Op } = require("sequelize");
console.log("Iniciando script de sincronização interativo...");

// Função para sincronizar os avatares
async function syncAvatars() {
  try {
    // Verificando se há algum ContactListItem sem urlPicture
    const items = await ContactListItem.findAll({
      where: {
        [Op.or]: [
          { urlPicture: null },
          { urlPicture: "" }
        ]
      },
      limit: 10 // Começar com poucos para testar
    });
    
    console.log(`Encontrados ${items.length} itens sem avatar`);
    
    // Atualizar cada item
    let atualizados = 0;
    for (const item of items) {
      const contact = await Contact.findOne({
        where: { 
          number: item.number,
          companyId: item.companyId 
        }
      });
      
      if (contact && contact.getDataValue("urlPicture")) {
        await item.update({ urlPicture: contact.getDataValue("urlPicture") });
        atualizados++;
        console.log(`Avatar atualizado para ${item.name}, número: ${item.number}`);
      }
    }
    
    console.log(`Sincronização concluída! ${atualizados} de ${items.length} itens atualizados.`);
  } catch (error) {
    console.error("Erro ao sincronizar:", error);
  }
}

// Exportar a função para o console
global.syncAvatars = syncAvatars;

console.log(`
-------------------------------------------------------
INSTRUÇÕES PARA SINCRONIZAR AVATARES NO CONSOLE DO NODE.JS
-------------------------------------------------------

1. Inicie o backend normalmente com: npm start
2. Em outro terminal, acesse o console do Node.js:
   cd backend && node -e "require('./scripts/syncConsole.js')"

3. No console do backend, execute:
   await syncAvatars()

4. O script vai verificar e sincronizar os avatares

5. Se quiser sincronizar todos, modifique a linha 'limit: 10' no arquivo
   syncConsole.js removendo essa limitação
-------------------------------------------------------
`);

// Isso garante que o script não encerre imediatamente
if (require.main === module) {
  console.log("Script carregado, use a função syncAvatars() para sincronizar avatares.");
}
