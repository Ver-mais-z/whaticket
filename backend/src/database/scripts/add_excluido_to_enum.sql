-- Script para adicionar 'Excluido' ao ENUM 'enum_Contacts_situation_old'
-- Execute este script diretamente no seu banco de dados PostgreSQL

-- Verifica se o valor 'Excluido' já existe no ENUM
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_Contacts_situation_old'
        ) 
        AND enumlabel = 'Excluido'
    ) THEN
        -- Adiciona o valor 'Excluido' ao ENUM
        ALTER TYPE "enum_Contacts_situation_old" ADD VALUE 'Excluido';
        RAISE NOTICE 'Valor "Excluido" adicionado ao ENUM com sucesso!';
    ELSE
        RAISE NOTICE 'O valor "Excluido" já existe no ENUM.';
    END IF;
END $$;
