// Test setup file
import * as dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.local' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random available port for tests
