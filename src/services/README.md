# Services Layer

This folder contains the service layer of the EPharma backend application. The service layer implements the business logic and acts as an intermediary between controllers and data access.

## Architecture

The service layer follows these principles:

1. **Separation of Concerns**: Controllers handle HTTP requests/responses, services handle business logic
2. **Reusability**: Service methods can be used by multiple controllers or other services
3. **Testability**: Business logic is isolated and easier to unit test
4. **Maintainability**: Changes to business logic are centralized in service files

## Current Services

### AdminService (`AdminService.ts`)
Handles all administrative operations including:
- Dashboard analytics and statistics
- User management (listing, status toggling)
- Pharmacy management (listing, verification)
- Prescription review and approval
- Product approval/rejection
- Paginated data retrieval

**Key Methods:**
- `getDashboardData()` - Retrieves comprehensive dashboard statistics
- `getUsers()` - Paginated user listing with search
- `toggleUserStatus()` - Enable/disable user accounts
- `getPharmacies()` - Paginated pharmacy listing
- `verifyPharmacy()` - Approve pharmacy registrations
- `getPrescriptions()` - Paginated prescription listing
- `reviewPrescription()` - Approve/reject prescriptions
- `getProducts()` - Paginated product listing
- `approveProduct()` / `rejectProduct()` - Product approval workflow

### AuthService (`AuthService.ts`)
Handles authentication and authorization operations:
- User registration (users, pharmacies, admins)
- Login with role-based authentication
- Password reset workflow
- Email verification

**Key Methods:**
- `registerUser()` - Register new users
- `registerPharmacy()` - Register new pharmacies
- `registerAdmin()` - Register new admins
- `login()` - Authenticate users with role support
- `requestPasswordReset()` - Initiate password reset
- `verifyEmail()` - Email verification workflow

### UserService (`UserService.ts`)
Handles user profile and account management:
- Profile retrieval and updates
- Password changes
- Account deactivation

**Key Methods:**
- `getUserProfile()` - Get user profile data
- `updateUserProfile()` - Update profile information
- `changePassword()` - Change user password
- `deactivateAccount()` - Deactivate user account

### OrderService (`OrderService.ts`)
Handles order management and processing:
- Order creation with validation
- Order tracking and status updates
- Order cancellation with stock restoration
- Prescription validation for restricted products

**Key Methods:**
- `createOrder()` - Create new orders with transaction handling
- `getUserOrders()` - Paginated user order history
- `getOrderById()` - Get detailed order information
- `cancelOrder()` - Cancel orders and restore stock
- `trackOrder()` - Get order tracking information
- `updateOrderStatus()` - Admin method to update order status
- `getAllOrders()` - Admin method for order management

### ProductService (`ProductService.ts`)
Handles product catalog and inventory management:
- Product CRUD operations
- Category management
- Pharmacy product listings
- Search and filtering

**Key Methods:**
- `getProducts()` - Get products with advanced filtering
- `getProductById()` - Get detailed product information
- `createProduct()` - Create new products (pharmacy)
- `updateProduct()` - Update product information
- `deleteProduct()` - Soft delete products
- `getProductsByPharmacy()` - Get pharmacy-specific products
- `getCategories()` - Get available product categories
- `getVerifiedPharmacies()` - Get list of verified pharmacies
- `getAllProductsForAdmin()` - Admin product management
- `updateProductStatus()` - Admin product approval

### PrescriptionService (`PrescriptionService.ts`)
Handles prescription upload and management:
- File upload validation
- Prescription review workflow
- File download and management

**Key Methods:**
- `uploadPrescription()` - Upload prescription files
- `getUserPrescriptions()` - Get user prescription history
- `getPrescriptionById()` - Get prescription details
- `getPrescriptionFile()` - Get prescription file for download
- `deletePrescription()` - Delete pending prescriptions
- `getAllPrescriptions()` - Admin prescription management
- `reviewPrescription()` - Admin prescription review

### PaymentService (`PaymentService.ts`)
Handles payment processing and refunds:
- Multiple payment methods (card, bank transfer, mobile money)
- Payment validation and processing
- Refund management
- Payment status tracking

**Key Methods:**
- `processPayment()` - Process payments with multiple methods
- `getPaymentStatus()` - Get payment status for orders
- `processRefund()` - Handle refund requests
- Payment method implementations (card, bank, mobile money)

## Usage Example

```typescript
// In a controller
import { AdminService } from '../services/AdminService';

export class AdminController {
  static getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboardData = await AdminService.getDashboardData();
    
    const response: ApiResponse = {
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully'
    };

    res.status(200).json(response);
  });
}
```

## Type Safety

All services include comprehensive TypeScript interfaces for:
- Method parameters
- Return types
- Data transfer objects (DTOs)

Example interfaces:
- `DashboardData` - Structure for dashboard statistics
- `PaginatedResult<T>` - Generic pagination wrapper
- `AuthResponse` - Authentication response structure

## Error Handling

Services use the custom `AppError` class for consistent error handling:
- Business logic errors are thrown as `AppError` instances
- Controllers catch and handle these errors appropriately
- Logging is integrated for debugging and monitoring

## Future Services

Consider creating additional services for:
- `OrderService` - Order management and processing
- `ProductService` - Product catalog management  
- `PrescriptionService` - Prescription handling
- `PaymentService` - Payment processing
- `NotificationService` - Email/SMS notifications
- `ReportService` - Analytics and reporting

## Best Practices

1. **Single Responsibility**: Each service handles one domain area
2. **Async/Await**: Use modern async patterns consistently
3. **Error Propagation**: Let controllers handle HTTP status codes
4. **Logging**: Include appropriate logging for debugging
5. **Validation**: Validate inputs at the service level
6. **Type Safety**: Use TypeScript interfaces for all data structures
