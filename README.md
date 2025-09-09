# EPharmacy Backend

A comprehensive Node.js + Express + TypeScript backend for a medical supplies marketplace with multi-role authentication and complete CRUD operations.

## 🚀 Features

### Authentication & Authorization
- **User Registration/Login** - JWT-based authentication
- **Admin Login** - Administrative access with role-based permissions
- **Pharmacy Login** - Pharmacy-specific authentication
- **Role-based Access Control** - User, Admin, and Pharmacy roles

### User Features
- **Profile Management** - Complete CRUD operations for user profiles
- **Prescription Upload** - File upload with metadata storage
- **Product Browsing** - Search, filter, and paginate products
- **Shopping Cart** - Add products to cart and place orders
- **Order Management** - Place orders with prescription validation
- **Order Tracking** - Real-time order status updates

### Admin Features
- **Dashboard Analytics** - Comprehensive statistics and insights
- **User Management** - Manage user accounts and permissions
- **Pharmacy Management** - Approve/verify pharmacy registrations
- **Prescription Review** - Approve/reject prescription uploads
- **Product Approval** - Review and approve pharmacy product listings

### Pharmacy Features (Optional MVP Extension)
- **Product Management** - Add, update, and manage product listings
- **Order Management** - View and manage assigned orders
- **Inventory Tracking** - Stock management and updates

### Technical Features
- **File Storage** - Local storage with configurable S3 support
- **Payment Integration** - Dummy payment endpoints for MVP
- **API Documentation** - Complete Swagger/OpenAPI documentation
- **Database Management** - PostgreSQL with TypeORM
- **Security** - Helmet, CORS, rate limiting, input validation
- **Logging** - Winston-based structured logging
- **Testing** - Comprehensive unit and integration tests
- **CI/CD** - GitHub Actions workflow with Docker support

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT
- **File Upload**: Multer
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Linting**: ESLint
- **Containerization**: Docker + Docker Compose

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd EPharmacy
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=epharmacy

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# File Storage
STORAGE_TYPE=local
UPLOAD_DIR=uploads
```

### 4. Database Setup
```bash
# Create database
createdb epharmacy

# Run migrations (if any)
npm run migration:run

# Or sync schema (development only)
npm run schema:sync
```

### 5. Start the application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 6. Access the API
- **API Base URL**: http://localhost:3000/api/v1
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/v1/health

## 🐳 Docker Setup

### Using Docker Compose (Recommended)
```bash
# Start all services (app + database)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build
```bash
# Build image
docker build -t epharmacy-backend .

# Run container
docker run -p 3000:3000 --env-file .env epharmacy-backend
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/v1/auth/register          # User registration
POST /api/v1/auth/login             # User login
POST /api/v1/auth/admin/login       # Admin login
POST /api/v1/auth/pharmacy/login    # Pharmacy login
```

### User Endpoints
```
GET    /api/v1/users/profile         # Get user profile
PUT    /api/v1/users/profile         # Update profile
POST   /api/v1/users/change-password # Change password
POST   /api/v1/users/deactivate      # Deactivate account
```

### Product Endpoints
```
GET    /api/v1/products              # Get all products (public)
GET    /api/v1/products/:id          # Get product by ID
POST   /api/v1/products              # Create product (pharmacy)
PUT    /api/v1/products/:id          # Update product (pharmacy)
DELETE /api/v1/products/:id          # Delete product (pharmacy)
```

### Prescription Endpoints
```
POST   /api/v1/prescriptions/upload        # Upload prescription
GET    /api/v1/prescriptions               # Get user prescriptions
GET    /api/v1/prescriptions/:id           # Get prescription by ID
GET    /api/v1/prescriptions/:id/download  # Download prescription
DELETE /api/v1/prescriptions/:id           # Delete prescription
```

### Order Endpoints
```
POST /api/v1/orders              # Create order
GET  /api/v1/orders              # Get user orders
GET  /api/v1/orders/:id          # Get order by ID
POST /api/v1/orders/:id/cancel   # Cancel order
GET  /api/v1/orders/:id/track    # Track order
```

### Admin Endpoints
```
GET  /api/v1/admin/dashboard                    # Dashboard analytics
GET  /api/v1/admin/users                        # Get all users
POST /api/v1/admin/users/:id/toggle-status      # Toggle user status
GET  /api/v1/admin/pharmacies                   # Get all pharmacies
POST /api/v1/admin/pharmacies/:id/verify        # Verify pharmacy
GET  /api/v1/admin/prescriptions                # Get prescriptions
POST /api/v1/admin/prescriptions/:id/review     # Review prescription
GET  /api/v1/admin/products                     # Get products
POST /api/v1/admin/products/:id/approve         # Approve product
POST /api/v1/admin/products/:id/reject          # Reject product
```

### Payment Endpoints
```
POST /api/v1/payments/process           # Process payment (dummy)
GET  /api/v1/payments/status/:orderId   # Get payment status
POST /api/v1/payments/refund            # Process refund
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- AuthController.test.ts
```

## 📊 Database Schema

### Core Entities
- **Users** - User accounts with profile information
- **Admins** - Administrative accounts
- **Pharmacies** - Pharmacy accounts with verification status
- **Products** - Product catalog with pharmacy associations
- **Prescriptions** - Uploaded prescription files with approval status
- **Orders** - Customer orders with items and status tracking
- **OrderItems** - Individual items within orders

### Relationships
- Users → Prescriptions (One-to-Many)
- Users → Orders (One-to-Many)
- Pharmacies → Products (One-to-Many)
- Orders → OrderItems (One-to-Many)
- Products → OrderItems (One-to-Many)

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - class-validator for request validation
- **CORS Protection** - Configurable cross-origin resource sharing
- **Helmet** - Security headers middleware
- **Role-based Access** - Fine-grained permission control

## 📁 Project Structure

```
src/
├── config/          # Configuration files (database, swagger)
├── controllers/     # Route controllers
├── entities/        # TypeORM entities
├── middleware/      # Custom middleware (auth, error handling)
├── routes/          # Express route definitions
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── tests/           # Test files
└── index.ts         # Application entry point
```

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-password
JWT_SECRET=your-production-jwt-secret
```

### Production Considerations
1. **Database**: Use managed PostgreSQL service (AWS RDS, Google Cloud SQL)
2. **File Storage**: Configure S3 or similar cloud storage
3. **Environment Variables**: Use secure secret management
4. **SSL/TLS**: Enable HTTPS with proper certificates
5. **Monitoring**: Set up logging and monitoring services
6. **Scaling**: Use load balancers and container orchestration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@epharmacy.com or create an issue in the repository.

## 🔄 API Versioning

Current API version: `v1`
Base URL: `/api/v1`

Future versions will be available at `/api/v2`, etc., maintaining backward compatibility.

## 📈 Performance

- **Pagination**: All list endpoints support pagination
- **Caching**: Response caching where appropriate
- **Database Indexing**: Optimized database queries
- **Connection Pooling**: Efficient database connections

## 🔍 Monitoring & Logging

- **Winston Logger**: Structured logging with multiple transports
- **Error Tracking**: Comprehensive error handling and logging
- **Health Checks**: Application and database health endpoints
- **Metrics**: Performance and usage metrics collection
