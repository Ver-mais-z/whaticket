import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('Contacts');
      if (!tableDescription['userId']) {
        await queryInterface.addColumn('Contacts', 'userId', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        console.log('Coluna userId adicionada com sucesso à tabela Contacts');
      } else {
        console.log('A coluna userId já existe na tabela Contacts');
      }
    } catch (error) {
      console.error('Erro ao adicionar a coluna userId:', error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.removeColumn('Contacts', 'userId');
      console.log('Coluna userId removida com sucesso da tabela Contacts');
    } catch (error) {
      console.error('Erro ao remover a coluna userId:', error);
      throw error;
    }
  },
};
