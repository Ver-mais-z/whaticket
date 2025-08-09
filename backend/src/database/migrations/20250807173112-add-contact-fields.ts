import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("Contacts", "cpfCnpj", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "representativeCode", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "city", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "instagram", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "situation", {
        type: DataTypes.ENUM('Ativo', 'Inativo', 'Suspenso'),
        allowNull: true,
        defaultValue: 'Ativo'
      }, { transaction });

      await queryInterface.addColumn("Contacts", "fantasyName", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "foundationDate", {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "creditLimit", {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
      }, { transaction });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("Contacts", "cpfCnpj", { transaction });
      await queryInterface.removeColumn("Contacts", "representativeCode", { transaction });
      await queryInterface.removeColumn("Contacts", "city", { transaction });
      await queryInterface.removeColumn("Contacts", "instagram", { transaction });
      await queryInterface.removeColumn("Contacts", "situation", { transaction });
      await queryInterface.removeColumn("Contacts", "fantasyName", { transaction });
      await queryInterface.removeColumn("Contacts", "foundationDate", { transaction });
      await queryInterface.removeColumn("Contacts", "creditLimit", { transaction });
    });
  }
};
