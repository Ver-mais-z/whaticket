module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.addColumn('Contacts', 'cpfCnpj', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.removeColumn('Contacts', 'cpfCnpj');
  }
};
