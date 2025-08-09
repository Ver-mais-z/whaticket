import { Request, Response, NextFunction } from 'express';

function globalTypeCheck(req: Request) {
  console.log('🔍 Verificação Global de Tipos');

  // Verificação segura
  if (req.user) {
    console.log('Campos do usuário:', {
      id: req.user.id,
      profile: req.user.profile,
      companyId: req.user.companyId
    });
  } else {
    console.log('Nenhum usuário autenticado');
  }
}

// Exemplo de uso em middleware
function exampleMiddleware(req: Request, res: Response, next: NextFunction) {
  globalTypeCheck(req);
  next();
}

export { globalTypeCheck, exampleMiddleware };
