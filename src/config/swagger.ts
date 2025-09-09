import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EPharmacy API',
      version: '1.0.0',
      description: 'Medical supplies marketplace backend API',
      contact: {
        name: 'EPharmacy Team',
        email: 'support@epharmacy.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            isActive: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            stockQuantity: { type: 'integer' },
            category: { type: 'string' },
            imageUrl: { type: 'string' },
            requiresPrescription: { type: 'boolean' },
            status: { type: 'string', enum: ['active', 'inactive', 'pending_approval'] },
            pharmacy: { $ref: '#/components/schemas/Pharmacy' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'approved', 'shipped', 'delivered', 'cancelled'] },
            shippingAddress: { type: 'string' },
            trackingNumber: { type: 'string' },
            orderItems: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
