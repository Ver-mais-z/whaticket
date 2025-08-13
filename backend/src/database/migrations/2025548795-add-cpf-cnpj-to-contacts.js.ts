module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('Contacts');
    if (!tableDefinition.cpfCnpj) {
      return queryInterface.addColumn('Contacts', 'cpfCnpj', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('Contacts');
    if (tableDefinition.cpfCnpj) {
      return queryInterface.removeColumn('Contacts', 'cpfCnpj');
    }
  }
};
