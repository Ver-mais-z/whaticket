// src/utils/auth-type-diagnostics.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';

// Interface para Request estendido
interface ExtendedRequest extends Request {
  user?: {
    id: string;
    profile: string;
    companyId: number;
  };
}

function authTypeDiagnostics() {
  console.log('🕵️ Diagnóstico de Tipos de Autenticação');

  // Simular um request com tipagem estendida
  const req = {} as ExtendedRequest;

  // Simular adição de usuário
  req.user = {
    id: 'test-id',
    profile: 'admin',
    companyId: 1
  };

  console.log('Tipo de req.user:', typeof req.user);
  console.log('Campos de req.user:', Object.keys(req.user || {}));

  // Simular verificação de token
  try {
    const token = jwt.sign(
      {
        id: 'test-id',
        profile: 'admin',
        companyId: 1
      },
      authConfig.secret,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, authConfig.secret);
    console.log('Token decodificado:', decoded);
  } catch (error) {
    console.error('Erro ao verificar token:', error);
  }
}

authTypeDiagnostics();
