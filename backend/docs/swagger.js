// src/docs/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Quiz App API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [ { bearerAuth: [] } ]
  },
  apis: [] // can add ./src/routes/*.js JSDoc comments later
};

module.exports = swaggerJSDoc(options);
