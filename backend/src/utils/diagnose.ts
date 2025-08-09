import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
  console.log('🔍 Diagnóstico de Conexão');
  console.log('Configurações:');
  console.log('Host:', process.env.DB_HOST);
  console.log('Porta:', process.env.DB_PORT);
  console.log('Banco:', process.env.DB_NAME);
  console.log('Usuário:', process.env.DB_USER);

  try {
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      logging: false
    });

    console.log('\n🕹️ Tentando autenticação...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso!');

    const [results] = await sequelize.query('SELECT NOW() as current_time');
    console.log('🕰️ Hora atual do banco:', results);
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  }
}

diagnose();
