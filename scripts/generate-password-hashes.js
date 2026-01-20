const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log('🔐 Gerando hashes bcrypt...\n');

  // Admin 1
  const password1 = 'Beagle3005*';
  const hash1 = await bcrypt.hash(password1, 10);
  console.log('Admin 1: contato@helciomattos.com.br');
  console.log('Senha:', password1);
  console.log('Hash:', hash1);
  console.log('');

  // Admin 2
  const password2 = '26+Sucesso+GH';
  const hash2 = await bcrypt.hash(password2, 10);
  console.log('Admin 2: gabriel_acardoso@hotmail.com');
  console.log('Senha:', password2);
  console.log('Hash:', hash2);
  console.log('');

  console.log('✅ Use estes hashes no arquivo database/05-add-users-table.sql');
}

generateHashes();
