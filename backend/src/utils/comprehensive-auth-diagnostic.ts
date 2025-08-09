// src/utils/comprehensive-auth-diagnostic.ts
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';
import { Request, Response, NextFunction } from 'express';

function comprehensiveAuthDiagnostic() {
  console.log('🔬 Diagnóstico Abrangente de Autenticação');

  // Payload de teste completo
  const testPayload = {
    id: 'test-user-123',
    username: 'testuser',
    profile: 'admin',
    companyId: 1,
    email: 'test@example.com'
  };

  try {
    // Gerar token principal
    const token = jwt.sign(testPayload, authConfig.secret, {
      expiresIn: authConfig.expiresIn
    });

    // Gerar refresh token
    const refreshToken = jwt.sign(testPayload, authConfig.refreshSecret, {
      expiresIn: authConfig.refreshExpiresIn
    });

    console.log('\n🔑 Tokens Gerados:');
    console.log('Token Principal:', token);
    console.log('Refresh Token:', refreshToken);

    // Verificar token principal
    const decodedToken = jwt.verify(token, authConfig.secret);
    console.log('\n🔍 Token Principal Decodificado:', decodedToken);

    // Verificar refresh token
    const decodedRefreshToken = jwt.verify(refreshToken, authConfig.refreshSecret);
    console.log('🔄 Refresh Token Decodificado:', decodedRefreshToken);

    // Simular request autenticado
    const mockRequest = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-refresh-token': refreshToken
      },
      user: testPayload
    } as any;

    // Função de middleware de teste
    function testAuthMiddleware(req: Request, res: Response, next: NextFunction) {
      try {
        const authHeader = req.headers.authorization;
        const refreshTokenHeader = req.headers['x-refresh-token'];

        if (!authHeader || !refreshTokenHeader) {
          throw new Error('Tokens não fornecidos');
        }

        const [, extractedToken] = authHeader.split(' ');
        const extractedRefreshToken = refreshTokenHeader as string;

        // Verificar token principal
        const mainTokenDecoded = jwt.verify(extractedToken, authConfig.secret);
        console.log('\n✅ Verificação de Token Principal:');
        console.log('Usuário Autenticado:', mainTokenDecoded);

        // Verificar refresh token
        const refreshTokenDecoded = jwt.verify(extractedRefreshToken, authConfig.refreshSecret);
        console.log('🔄 Verificação de Refresh Token:');
        console.log('Refresh Token Válido:', refreshTokenDecoded);

        next();
      } catch (error) {
        console.error('❌ Erro de Autenticação:', error);
      }
    }

    // Executar middleware de teste
    testAuthMiddleware(mockRequest, {} as Response, () => {
      console.log('🚀 Middleware concluído com sucesso');
    });

  } catch (error) {
    console.error('❌ Erro no Diagnóstico:', error);
  }
}

comprehensiveAuthDiagnostic();
