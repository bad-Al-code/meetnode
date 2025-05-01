require('dotenv').config();

const jwt = require('jsonwebtoken');
const userIdToSign = process.argv[2]; // Get user ID from command line argument
const secret = process.env.JWT_SECRET;

if (!userIdToSign) {
  console.error('Error: Please provide a User ID as a command line argument.');
  console.log('Usage: node generate-token.js <user-uuid>');
  process.exit(1);
}
if (!secret) {
  console.error('Error: JWT_SECRET not found in .env file.');
  process.exit(1);
}
// Basic UUID validation (optional but good)
if (
  !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    userIdToSign
  )
) {
  console.warn('Warning: Provided User ID does not look like a standard UUID.');
}

const payload = {
  userId: userIdToSign,
  // Add any other claims your auth middleware might eventually expect
  // iat: Math.floor(Date.now() / 1000), // Issued At (optional)
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' }); // Token expires in 1 hour

console.log(`Generated JWT for userId ${userIdToSign}:`);
console.log(token);
