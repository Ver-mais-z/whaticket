export const isValidCPF = (cpf) => {
  if (!cpf) return false;
  const cpfDigits = cpf.replace(/\D/g, '');
  if (cpfDigits.length !== 11 || /^(\d)\1{10}$/.test(cpfDigits)) {
    return false;
  }
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpfDigits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpfDigits.substring(9, 10))) {
    return false;
  }
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpfDigits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cpfDigits.substring(10, 11))) {
    return false;
  }
  return true;
};

export const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false;
  const cnpjDigits = cnpj.replace(/\D/g, '');
  if (cnpjDigits.length !== 14 || /^(\d)\1{13}$/.test(cnpjDigits)) {
    return false;
  }
  let size = cnpjDigits.length - 2;
  let numbers = cnpjDigits.substring(0, size);
  const digits = cnpjDigits.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) {
    return false;
  }
  size += 1;
  numbers = cnpjDigits.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) {
    return false;
  }
  return true;
};
