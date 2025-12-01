import process from 'process/browser.js';
process.env = process.env || {};
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
export { process };
