// src/utils/auth-compatibility-check.ts
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';
import { Request, Response, NextFunction } from 'express';

function authCompatibilityCheck() {
  console.log('🔄 Verificação de Compatibilidade de Autenticação');

  // Cenários de autenticação
  const scenarios = [
    {
      name: 'Admin',
      payload: {
        id: '1',
        profile: 'admin',
        companyId: 1,
        username: 'admin_user'
      }
    },
    {
      name: 'Usuário Padrão',
      payload: {
        id: '2',
        profile: 'user',
        companyId: 2,
        username: 'standard_user'
      }
    }
  ];

  scenarios.forEach(scenario => {
    console.log(`\n🧪 Cenário: ${scenario.name}`);

    try {
      // Gerar token principal
      const token = jwt.sign(scenario.payload, authConfig.secret, {
        expiresIn: authConfig.expiresIn
      });

      // Gerar refresh token
      const refreshToken = jwt.sign(scenario.payload, authConfig.refreshSecret, {
        expiresIn: authConfig.refreshExpiresIn
      });

      console.log('Token Principal:', token);
      console.log('Refresh Token:', refreshToken);

      // Simular request
      const mockRequest = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-refresh-token': refreshToken
        },
        user: scenario.payload
      } as any;

      console.log('Payload:', scenario.payload);
      console.log('Request Headers:', (mockRequest as any).headers);

      // Função de verificação
      function verifyTokens(req: Request, res: Response, next: NextFunction) {
        try {
          // Verificar token principal
          jwt.verify(token, authConfig.secret);
          console.log('✅ Token Principal Válido');

          // Verificar refresh token
          jwt.verify(refreshToken, authConfig.refreshSecret);
          console.log('🔄 Refresh Token Válido');

          next();
        } catch (error) {
          console.error('❌ Erro de Verificação:', error);
        }
      }

      // Executar verificação
      verifyTokens(mockRequest, {} as Response, () => {
        console.log('🚀 Verificação concluída com sucesso');
      });

    } catch (error) {
      console.error('Erro no cenário:', error);
    }
  });
}

authCompatibilityCheck();
