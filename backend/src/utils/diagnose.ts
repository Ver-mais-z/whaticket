// src/utils/diagnose.ts
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

async function diagnose() {
  console.log('🔍 Diagnóstico de Conexão');

  // Diagnóstico PostgreSQL
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

    console.log('\n🗄️ Testando PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conexão PostgreSQL estabelecida com sucesso!');

    const [results] = await sequelize.query('SELECT NOW() as current_time');
    console.log('🕰️ Hora atual do banco:', results);
  } catch (error) {
    console.error('❌ Erro de conexão PostgreSQL:', error);
  }

  // Diagnóstico Redis
  try {
    console.log('\n💾 Testando Redis...');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379
    });

    await new Promise((resolve, reject) => {
      redis.on('ready', () => {
        console.log('✅ Conexão Redis estabelecida com sucesso!');
        resolve(true);
        redis.quit();
      });
      redis.on('error', (err) => {
        console.error('❌ Erro de conexão Redis:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('❌ Erro ao conectar no Redis:', error);
  }

  // Informações do Sistema
  console.log('\n💻 Informações do Sistema:');
  console.log('Node.js version:', process.version);
  console.log('Platform:', process.platform);
}

diagnose();
