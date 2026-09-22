function validateRegister({ name, email, password }) {
  if (!name || !email || !password) {
    return 'Name, email, and password are required.';
  }

  if (String(password).length < 6) {
    return 'Password must be at least 6 characters.';
  }

  return null;
}

function validateLogin({ email, password }) {
  if (!email || !password) {
    return 'Email and password are required.';
  }

  return null;
}

module.exports = {
  validateRegister,
  validateLogin
};
