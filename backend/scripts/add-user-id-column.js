const { sequelize } = require('../dist/models');

async function addUserIdColumn() {
  try {
    // Verificar se a coluna já existe
    const [results] = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='Contacts' AND column_name='userId'`
    );

    if (results.length === 0) {
      // Adicionar a coluna se não existir
      await sequelize.query(
        `ALTER TABLE "Contacts" 
         ADD COLUMN "userId" INTEGER 
         REFERENCES "Users" ("id") 
         ON UPDATE CASCADE 
         ON DELETE SET NULL`
      );
      console.log('Coluna userId adicionada com sucesso à tabela Contacts');
    } else {
      console.log('A coluna userId já existe na tabela Contacts');
    }
  } catch (error) {
    console.error('Erro ao adicionar a coluna userId:', error);
  } finally {
    await sequelize.close();
  }
}

addUserIdColumn();
