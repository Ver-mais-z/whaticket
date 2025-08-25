// Uso: node scripts/set-company1-email.js novoemail@dominio.com
// Atualiza o email da Company id=1 caso esteja nulo/vazio e registra o valor anterior

const { sequelize } = require("../dist/models");

async function run() {
  const newEmail = (process.argv[2] || "admin@admin.com").trim();
  if (!newEmail || !newEmail.includes("@")) {
    console.error("Email inválido. Ex.: node scripts/set-company1-email.js empresa1@example.com");
    process.exit(1);
  }

  console.log(`Definindo email da Company 1 como: ${newEmail}`);

  try {
    const [companies] = await sequelize.query(
      'SELECT id, "email" FROM "Companies" WHERE id = 1'
    );

    if (!companies || companies.length === 0) {
      console.error("Company id=1 não encontrada.");
      process.exit(2);
    }

    const current = companies[0].email;
    console.log(`Email atual: ${current || "<null/vazio>"}`);

    if (current && String(current).trim() !== "") {
      console.log("Email já definido. Nada a fazer.");
      return;
    }

    const [updateRes] = await sequelize.query(
      'UPDATE "Companies" SET "email" = :email, "updatedAt" = NOW() WHERE id = 1 RETURNING id, "email"',
      { replacements: { email: newEmail } }
    );

    const updated = Array.isArray(updateRes) ? updateRes[0] : updateRes;
    console.log("Company atualizada:", updated);
    console.log("Pronto! Agora você pode editar a empresa pelo painel.");
  } catch (err) {
    console.error("Erro ao definir email da Company 1:", err);
    process.exit(3);
  } finally {
    try { await sequelize.close(); } catch {}
  }
}

run();
