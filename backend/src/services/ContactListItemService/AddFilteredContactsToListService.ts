import { Sequelize, Op, literal } from "sequelize";
import Contact from "../../models/Contact";
import ContactListItem from "../../models/ContactListItem";
import ContactTag from "../../models/ContactTag";
import logger from "../../utils/logger";
import CheckContactNumber from "../WbotServices/CheckNumber";

interface FilterParams {
  channel?: string[];
  representativeCode?: string[];
  city?: string[];
  situation?: string[];
  monthYear?: string; // Formato YYYY-MM
  minCreditLimit?: string;
  maxCreditLimit?: string;
  tags?: number[];
}

interface Request {
  contactListId: number;
  companyId: number;
  filters: FilterParams;
}

interface Response {
  added: number;
  duplicated: number;
  errors: number;
}

const AddFilteredContactsToListService = async ({
  contactListId,
  companyId,
  filters
}: Request): Promise<Response> => {
  try {
    // Validar parâmetros de entrada
    if (!contactListId) {
      throw new Error('ID da lista de contatos não informado');
    }
    
    if (!companyId) {
      throw new Error('ID da empresa não informado');
    }
    
    if (!filters || Object.keys(filters).length === 0) {
      throw new Error('Nenhum filtro informado');
    }
    
    logger.info(`Iniciando adição de contatos filtrados à lista ${contactListId}`);
    logger.info(`Filtros recebidos: ${JSON.stringify(filters)}`);

    // Construir condições de filtro para a consulta principal
    const whereConditions: any[] = [{ companyId }];

    // Filtro de canal
    if (filters.channel && filters.channel.length > 0) {
      whereConditions.push({ channel: { [Op.in]: filters.channel } });
    }

    // Filtro de código de representante
    if (filters.representativeCode && filters.representativeCode.length > 0) {
      whereConditions.push({ representativeCode: { [Op.in]: filters.representativeCode } });
    }

    // Filtro de cidade
    if (filters.city && filters.city.length > 0) {
      whereConditions.push({ city: { [Op.in]: filters.city } });
    }

    // Filtro de situação
    if (filters.situation && filters.situation.length > 0) {
      whereConditions.push({ situation: { [Op.in]: filters.situation } });
    }

    // Filtro de mês/ano (data de fundação)
    if (filters.monthYear) {
      try {
        const [year, month] = filters.monthYear.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0); // Último dia do mês
        
        whereConditions.push({
          foundationDate: {
            [Op.between]: [startDate, endDate]
          }
        });
        
        logger.info(`Filtro de data: ${startDate.toISOString()} até ${endDate.toISOString()}`);
      } catch (error: any) {
        logger.error(`Erro ao processar filtro de mês/ano:`, {
          message: error.message,
          monthYear: filters.monthYear
        });
      }
    }

    // Filtro de limite de crédito (mínimo e máximo inclusivo)
    if (filters.minCreditLimit || filters.maxCreditLimit) {
      try {
        const parseMoney = (val: string): number => {
          const cleaned = String(val)
            .replace(/\s+/g, '')
            .replace(/R\$?/gi, '')
            .replace(/\./g, '') // remove separador de milhar
            .replace(',', '.'); // vírgula para ponto
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const hasMin = typeof filters.minCreditLimit !== 'undefined' && filters.minCreditLimit !== '';
        const hasMax = typeof filters.maxCreditLimit !== 'undefined' && filters.maxCreditLimit !== '';
        const minValue = hasMin ? parseMoney(filters.minCreditLimit as string) : undefined;
        const maxValue = hasMax ? parseMoney(filters.maxCreditLimit as string) : undefined;

        // Expressão para converter creditLimit (VARCHAR BRL) em número
        const creditLimitNumeric = literal(
          `CAST(REPLACE(REPLACE(REPLACE(TRIM("creditLimit"), 'R$', ''), '.', ''), ',', '.') AS NUMERIC)`
        );

        // Ignorar registros com creditLimit NULL ou vazio (evita falha no CAST e resultados incorretos)
        whereConditions.push(literal(`"creditLimit" IS NOT NULL`));
        whereConditions.push(literal(`TRIM("creditLimit") <> ''`));

        if (hasMin && hasMax) {
          whereConditions.push(
            Sequelize.where(creditLimitNumeric, { [Op.between]: [minValue!, maxValue!] })
          );
          logger.info(`Filtro de crédito entre: ${minValue} e ${maxValue}`);
        } else if (hasMin) {
          whereConditions.push(
            Sequelize.where(creditLimitNumeric, { [Op.gte]: minValue! })
          );
          logger.info(`Filtro de crédito mínimo: ${minValue}`);
        } else if (hasMax) {
          whereConditions.push(
            Sequelize.where(creditLimitNumeric, { [Op.lte]: maxValue! })
          );
          logger.info(`Filtro de crédito máximo: ${maxValue}`);
        }
      } catch (error: any) {
        logger.error(`Erro ao processar filtro de limite de crédito:`, {
          message: error.message,
          minCreditLimit: filters.minCreditLimit,
          maxCreditLimit: filters.maxCreditLimit
        });
      }
    }

    // Filtro de tags
    if (filters.tags && filters.tags.length > 0) {
      try {
        logger.info(`Filtrando por tags: ${filters.tags.join(', ')}`);
        
        // Buscar contatos que possuem todas as tags especificadas
        const contactTags = await ContactTag.findAll({
          where: { tagId: { [Op.in]: filters.tags } },
          attributes: ['contactId', 'tagId'],
          raw: true
        });
        
        // Agrupar por contactId
        const contactTagsMap = new Map();
        contactTags.forEach(ct => {
          if (!contactTagsMap.has(ct.contactId)) {
            contactTagsMap.set(ct.contactId, new Set());
          }
          contactTagsMap.get(ct.contactId).add(ct.tagId);
        });
        
        const contactIdsWithTags = Array.from(contactTagsMap.entries())
          .filter(([_, tagIds]) => filters.tags!.every(tagId => tagIds.has(tagId)))
          .map(([contactId, _]) => contactId);
        
        logger.info(`Encontrados ${contactIdsWithTags.length} contatos com as tags especificadas`);
        
        if (contactIdsWithTags.length > 0) {
          whereConditions.push({ id: { [Op.in]: contactIdsWithTags } });
        } else {
          // Se não houver contatos com todas as tags, retornar vazio
          return { added: 0, duplicated: 0, errors: 0 };
        }
      } catch (error: any) {
        logger.error(`Erro ao processar filtro de tags:`, {
          message: error.message,
          stack: error.stack,
          tags: filters.tags
        });
        throw new Error(`Erro ao processar filtro de tags: ${error.message}`);
      }
    }

    // Buscar contatos que correspondem aos filtros
    let contacts = [] as any[];
    const creditFilterActive = Boolean(filters.minCreditLimit || filters.maxCreditLimit);
    const creditLimitNumericAttr = creditFilterActive
      ? literal(`CAST(REPLACE(REPLACE(REPLACE(TRIM("creditLimit"), 'R$', ''), '.', ''), ',', '.') AS NUMERIC)`) 
      : null;
    
    try {
      logger.info(`WhereConditions finais: ${JSON.stringify(whereConditions)}`);
      if (creditFilterActive) {
        logger.info(`Faixa numérica aplicada (min/max): ${filters.minCreditLimit} / ${filters.maxCreditLimit}`);
      }
      contacts = await Contact.findAll({
        where: { [Op.and]: whereConditions },
        attributes: creditFilterActive
          ? ['id', 'name', 'number', 'email', 'creditLimit', [creditLimitNumericAttr!, 'creditLimitNum']]
          : ['id', 'name', 'number', 'email'],
        order: [['id', 'ASC']]
      }) as any[];

      logger.info(`Encontrados ${contacts.length} contatos correspondentes aos filtros`);
      if (creditFilterActive) {
        const sample = contacts.slice(0, 10).map(c => ({ id: c.id, creditLimit: c.get ? c.get('creditLimit') : c.creditLimit, creditLimitNum: c.get ? c.get('creditLimitNum') : (c as any).creditLimitNum }));
        logger.info(`Amostra de creditLimit após conversão: ${JSON.stringify(sample)}`);
        try {
          const details = contacts.map(c => ({ id: c.id, creditLimit: c.get ? c.get('creditLimit') : c.creditLimit, creditLimitNum: c.get ? c.get('creditLimitNum') : (c as any).creditLimitNum }));
          logger.info(`Detalhe de creditLimit convertidos (${details.length}): ${JSON.stringify(details)}`);
        } catch (e) {
          logger.warn('Falha ao montar detalhes de creditLimit para log:', { message: (e as any).message });
        }
      }
    } catch (error: any) {
      logger.error('Erro ao buscar contatos com os filtros especificados:', {
        message: error.message,
        stack: error.stack,
        whereConditions: JSON.stringify(whereConditions, null, 2)
      });
      throw new Error(`Erro ao buscar contatos: ${error.message}`);
    }

    // Buscar itens já existentes na lista para evitar duplicatas
    const existingItems = await ContactListItem.findAll({
      where: { contactListId },
      attributes: ['number', 'email'],
      raw: true
    });
    logger.info(`Encontrados ${existingItems.length} contatos já existentes na lista (checando por number/email)`);

    // Extrair chaves de comparação (número e email) dos contatos existentes
    const existingNumbers = new Set((existingItems as any[]).map(item => item.number).filter(Boolean));
    const existingNumbersDigits = new Set(
      (existingItems as any[])
        .map(item => (item.number ? String(item.number).replace(/\D/g, "") : null))
        .filter(Boolean) as string[]
    );
    const existingEmails = new Set((existingItems as any[]).map(item => item.email).filter(Boolean));
  
    // Adicionar contatos à lista
    let added = 0;
    let duplicated = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        // Verificar duplicidade por número (e como fallback por email)
        const rawNumber = contact.number || "";
        const normalizedCandidate = String(rawNumber).replace(/\D/g, "");
        const isDuplicateByNumber =
          (rawNumber && existingNumbers.has(rawNumber)) ||
          (normalizedCandidate && existingNumbersDigits.has(normalizedCandidate));
        const isDuplicateByEmail = contact.email && existingEmails.has(contact.email);
        if (isDuplicateByNumber || isDuplicateByEmail) {
          duplicated++;
          continue;
        }

        // Adicionar contato à lista
        const newItem = await ContactListItem.create({
          contactListId,
          name: contact.name,
          number: contact.number,
          email: contact.email,
          companyId
        });

        // Validar número WhatsApp imediatamente (mesma lógica do ImportContacts)
        try {
          const response = await CheckContactNumber(newItem.number, companyId);
          newItem.isWhatsappValid = response ? true : false;
          if (response) {
            const formattedNumber = response; // serviço retorna número normalizado
            newItem.number = formattedNumber;
          }
          await newItem.save();
        } catch (e) {
          logger.error(`Número de contato inválido: ${newItem.number}`);
        }

        // Atualiza caches locais para evitar nova inserção duplicada no mesmo loop
        if (contact.number) {
          existingNumbers.add(contact.number);
          const digits = String(contact.number).replace(/\D/g, "");
          if (digits) existingNumbersDigits.add(digits);
        }
        if (newItem.number) {
          existingNumbers.add(newItem.number);
          const digits = String(newItem.number).replace(/\D/g, "");
          if (digits) existingNumbersDigits.add(digits);
        }
        if (contact.email) existingEmails.add(contact.email);

        added++;
      } catch (error: any) {
        logger.error(`Erro ao adicionar contato ${contact.id} à lista:`, {
          message: error.message,
          stack: error.stack,
          contactId: contact.id,
          contactListId,
          name: contact.name,
          number: contact.number
        });
        errors++;
      }
    }

    logger.info(`Resultado da adição: ${added} adicionados, ${duplicated} duplicados, ${errors} erros`);

    return {
      added,
      duplicated,
      errors
    };
  } catch (error: any) {
    // Capturar erros não tratados em outras partes do serviço
    logger.error('Erro não tratado no serviço de adição de contatos filtrados:', {
      message: error.message,
      stack: error.stack,
      contactListId,
      companyId,
      filters: JSON.stringify(filters, null, 2)
    });
    throw error;
  }
};

export default AddFilteredContactsToListService;
