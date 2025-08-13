import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Esta é uma migração dummy para resolver o erro "didn't return a promise".
    // O arquivo original 20250808165050-change-creditlimit-to-string.ts não foi encontrado.
    // Não há operações de banco de dados a serem feitas aqui.
    return Promise.resolve();
  },

  down: async (queryInterface: QueryInterface) => {
    // Esta é a parte de rollback da migração dummy.
    // Não há operações de banco de dados a serem desfeitas aqui.
    return Promise.resolve();
  }
};
