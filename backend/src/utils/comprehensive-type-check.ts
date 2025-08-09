// src/utils/comprehensive-type-check.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Interface de Request estendido
interface ExtendedRequest extends Request {
  user?: {
    id: string;
    profile: string;
    companyId: number;
  };
}

function comprehensiveTypeCheck() {
  console.log('🔍 Diagnóstico Completo de Tipos');

  // Criar request mockado
  const mockRequest: ExtendedRequest = {} as ExtendedRequest;

  // Adicionar usuário ao request
  mockRequest.user = {
    id: 'test-123',
    profile: 'admin',
    companyId: 1
  };

  // Verificações de tipo
  console.log('Tipo de usuário:', typeof mockRequest.user);
  console.log('Campos do usuário:', Object.keys(mockRequest.user));

  // Verificar geração de token
  try {
    const token = jwt.sign(
      {
        id: 'test-123',
        profile: 'admin',
        companyId: 1
      },
      'secret_key',
      { expiresIn: '1h' }
    );

    console.log('Token gerado com sucesso');
    const decoded = jwt.verify(token, 'secret_key');
    console.log('Token decodificado:', decoded);
  } catch (error) {
    console.error('Erro ao gerar/verificar token:', error);
  }

  // Exemplo de middleware
  function testMiddleware(req: ExtendedRequest, res: Response, next: NextFunction) {
    console.log('Informações do usuário:', {
      id: req.user?.id,
      profile: req.user?.profile,
      companyId: req.user?.companyId
    });
    next();
  }

  // Executar middleware de teste
  testMiddleware(mockRequest, {} as Response, () => {});
}

comprehensiveTypeCheck();
