import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDefinition: any = await queryInterface.describeTable('Contacts');
    if (!tableDefinition.userId) {
      await queryInterface.addColumn('Contacts', 'userId', {
        type: DataTypes.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDefinition: any = await queryInterface.describeTable('Contacts');
    if (tableDefinition.userId) {
      await queryInterface.removeColumn('Contacts', 'userId');
    }
  },
};
