declare namespace Contact {
  interface Attributes {
    id?: number;
    name: string;
    number: string;
    email?: string;
    profilePicUrl?: string;
    isGroup?: boolean;
    disableBot?: boolean;
    acceptAudioMessage?: boolean;
    active?: boolean;
    channel?: string;
    companyId: number;
    remoteJid?: string;
    cpfCnpj?: string;
    representativeCode?: string;
    city?: string;
    instagram?: string;
    situation?: 'Ativo' | 'Inativo' | 'Suspenso';
    fantasyName?: string;
    foundationDate?: Date;
    creditLimit?: string;
  }

  interface CreateDTO {
    name: string;
    number: string;
    companyId: number;
    email?: string;
    cpfCnpj?: string;
    representativeCode?: string;
    city?: string;
    instagram?: string;
    situation?: 'Ativo' | 'Inativo' | 'Suspenso';
    fantasyName?: string;
    foundationDate?: Date;
    creditLimit?: string;
  }

  interface UpdateDTO {
    id?: number;
    name?: string;
    number?: string;
    email?: string;
    cpfCnpj?: string;
    representativeCode?: string;
    city?: string;
    instagram?: string;
    situation?: 'Ativo' | 'Inativo' | 'Suspenso';
    fantasyName?: string;
    foundationDate?: Date;
    creditLimit?: string;
  }

  interface FilterOptions {
    companyId: number;
    searchTerm?: string;
    page?: number;
    pageSize?: number;
    cpfCnpj?: string;
    representativeCode?: string;
    city?: string;
    situation?: 'Ativo' | 'Inativo' | 'Suspenso';
  }
}
