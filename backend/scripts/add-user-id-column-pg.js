const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432,
});

async function addUserIdColumn() {
  try {
    await client.connect();
    
    // Verificar se a coluna já existe
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='Contacts' AND column_name='userId';
    `;
    
    const result = await client.query(checkQuery);
    
    if (result.rows.length === 0) {
      // Adicionar a coluna se não existir
      const alterQuery = `
        ALTER TABLE "Contacts" 
        ADD COLUMN "userId" INTEGER 
        REFERENCES "Users" ("id") 
        ON UPDATE CASCADE 
        ON DELETE SET NULL;
      `;
      
      await client.query(alterQuery);
      console.log('✅ Coluna userId adicionada com sucesso à tabela Contacts');
    } else {
      console.log('ℹ️ A coluna userId já existe na tabela Contacts');
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar a coluna userId:', error.message);
  } finally {
    await client.end();
  }
}

addUserIdColumn();
