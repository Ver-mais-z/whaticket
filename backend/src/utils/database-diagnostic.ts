import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function databaseDiagnostic() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    logging: console.log
  });

  try {
    // Testar conexão
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco estabelecida');

    // Listar todas as tabelas
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log('📊 Tabelas existentes:');
    console.table(tables);

    // Contar registros em algumas tabelas importantes
    const importantTables = [
      'Users',
      'Companies',
      'Contacts',
      // Adicione outras tabelas relevantes do seu projeto
    ];

    for (const table of importantTables) {
      try {
        const [results] = await sequelize.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`📈 Registros em ${table}:`, results);
      } catch (countError) {
        console.warn(`⚠️ Não foi possível contar registros em ${table}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

databaseDiagnostic();
