// src/utils/type-diagnostics.ts
import { Request, Response, NextFunction } from 'express';

// Interface de Request estendido
interface ExtendedRequest extends Request {
  user?: {
    id: string;
    profile: string;
    companyId: number;
  };
}

function typeDiagnostics() {
  console.log('🔬 Diagnóstico Detalhado de Tipos');

  // Criar request mockado com tipagem estendida
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

  // Exemplo de middleware
  function testMiddleware(req: ExtendedRequest, res: Response, next: NextFunction) {
    console.log('ID do usuário:', req.user?.id);
    next();
  }

  // Executar verificações
  testMiddleware(mockRequest, {} as Response, () => {});
}

typeDiagnostics();
