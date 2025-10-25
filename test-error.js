// Simple test to check if TasklyError creation works
const { TasklyError, ERROR_CODES } = require('./dist/cjs/errors/index.js');

try {
  console.log('Creating TasklyError...');
  const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED);
  console.log('TasklyError created successfully:', error.message);
  console.log('Error code:', error.code);
} catch (e) {
  console.error('Failed to create TasklyError:', e);
}
