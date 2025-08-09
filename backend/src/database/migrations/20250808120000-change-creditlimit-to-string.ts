import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Verificar se a coluna já existe e seu tipo atual
      const tableDescription = await queryInterface.describeTable('Contacts');
      const columns: Record<string, any> = tableDescription as any;
      
      if (columns.creditLimit && columns.creditLimit.type === 'DECIMAL') {
        // Alterar o tipo da coluna creditLimit para VARCHAR(50)
        await queryInterface.changeColumn("Contacts", "creditLimit", {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: null
        }, { transaction });
      }
      
      return Promise.resolve();
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Reverter para DECIMAL(10,2) se necessário
      await queryInterface.changeColumn("Contacts", "creditLimit", {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
      }, { transaction });
      
      return Promise.resolve();
    });
  }
};
