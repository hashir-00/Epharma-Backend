import { AuthUtils } from '../../utils/auth';
import { UserRole } from '../../types';

// Set up test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

describe('AuthUtils', () => {
  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testpassword123';
      const hashedPassword = await AuthUtils.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testpassword123';
      const hashedPassword = await AuthUtils.hashPassword(password);

      const isValid = await AuthUtils.comparePassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await AuthUtils.hashPassword(password);

      const isValid = await AuthUtils.comparePassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token successfully', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.USER
      };

      const token = AuthUtils.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });

    it('should throw error when JWT_SECRET is not defined', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.USER
      };

      expect(() => AuthUtils.generateToken(payload)).toThrow('JWT_SECRET is not defined');
      
      // Restore the secret
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token successfully', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.USER
      };

      const token = AuthUtils.generateToken(payload);
      const verified = AuthUtils.verifyToken(token);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => AuthUtils.verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error when JWT_SECRET is not defined', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      const token = 'some.token.here';

      expect(() => AuthUtils.verifyToken(token)).toThrow('JWT_SECRET is not defined');
      
      // Restore the secret
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should return null for invalid header format', () => {
      const authHeader = 'InvalidHeader token';
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for undefined header', () => {
      const token = AuthUtils.extractTokenFromHeader(undefined);

      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = AuthUtils.extractTokenFromHeader('');

      expect(token).toBeNull();
    });
  });
});
