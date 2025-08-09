// src/utils/auth-diagnostic.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';

function authDiagnostic() {
  console.log('🔐 Diagnóstico de Autenticação');

  // Simular payload de token
  const testPayload = {
    id: 'test-user-123',
    username: 'testuser',
    profile: 'admin',
    companyId: 1,
    iat: Date.now(),
    exp: Date.now() + 3600 // 1 hora de expiração
  };

  try {
    // Gerar token de teste
    const token = jwt.sign(testPayload, authConfig.secret);

    // Simular request
    const mockRequest = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as Request;

    // Verificar token
    const decoded = jwt.verify(token, authConfig.secret);
    console.log('Token decodificado:', decoded);

    // Adicionar usuário ao request
    (mockRequest as any).user = {
      id: testPayload.id,
      profile: testPayload.profile,
      companyId: testPayload.companyId
    };

    // Verificações
    console.log('Informações do Usuário:');
    console.log('ID:', (mockRequest as any).user.id);
    console.log('Perfil:', (mockRequest as any).user.profile);
    console.log('Company ID:', (mockRequest as any).user.companyId);

  } catch (error) {
    console.error('Erro no diagnóstico:', error);
  }
}

authDiagnostic();
