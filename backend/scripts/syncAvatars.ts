// Script simples para verificar se os models estão sendo carregados
// Rode com: npx ts-node backend/scripts/syncAvatars.ts

import path from "path";
import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Configure as variáveis de ambiente
console.log("Configurando variáveis de ambiente...");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log("Variáveis de ambiente configuradas.");

// Importamos a configuração do banco diretamente
const dbConfig = require("../dist/config/database").default;
console.log("Configuração do banco carregada.");

// Criamos uma instância do Sequelize manualmente
const sequelize = new Sequelize(dbConfig);
console.log("Instância do Sequelize criada.");

// Importamos os models manualmente
const ContactListItem = require("../dist/models/ContactListItem").default;
const Contact = require("../dist/models/Contact").default;
console.log("Models importados.");

// Inicializamos os models manualmente
const models = [Contact, ContactListItem];
models.forEach(model => {
  model.init(model.modelAttributes, {
    sequelize,
    modelName: model.name
  });
});
console.log("Models inicializados.");

// Estabelecemos as associações
models.forEach(model => {
  if (model.associate) {
    model.associate(sequelize.models);
  }
});
console.log("Associações estabelecidas.");

async function main() {
  try {
    console.log("Testando a conexão com o banco de dados...");
    await sequelize.authenticate();
    console.log("Conexão estabelecida com sucesso!");

    // Verificar se o model está disponível
    console.log("Verificando se o model ContactListItem está disponível...");
    if (ContactListItem.findAll) {
      console.log("ContactListItem.findAll está disponível!");
      
      // Testar uma consulta simples
      console.log("Executando consulta de teste...");
      const count = await ContactListItem.count();
      console.log(`Total de ContactListItems: ${count}`);
    } else {
      console.error("ContactListItem.findAll não está disponível!");
    }
  } catch (error) {
    console.error("Erro ao executar o teste:", error);
    process.exit(1);
  }
}

main();

