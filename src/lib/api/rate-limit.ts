import { NextRequest } from 'next/server';
import { RateLimitError } from './error-handler';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return {
    check: (request: NextRequest): { allowed: boolean; resetTime: number; remaining: number } => {
      const key = keyGenerator(request);
      const now = Date.now();
      const resetTime = now + windowMs;

      let entry = rateLimitStore.get(key);

      // Create new entry if doesn't exist or expired
      if (!entry || entry.resetTime <= now) {
        entry = { count: 0, resetTime };
        rateLimitStore.set(key, entry);
      }

      const allowed = entry.count < maxRequests;
      const remaining = Math.max(0, maxRequests - entry.count - 1);

      if (allowed) {
        entry.count++;
      }

      return { allowed, resetTime: entry.resetTime, remaining };
    },

    increment: (request: NextRequest) => {
      const key = keyGenerator(request);
      const entry = rateLimitStore.get(key);
      if (entry) {
        entry.count++;
      }
    },

    reset: (request: NextRequest) => {
      const key = keyGenerator(request);
      rateLimitStore.delete(key);
    },
  };
}

function defaultKeyGenerator(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  return `rate_limit:${ip}`;
}

// Predefined rate limiters
export const rateLimiters = {
  // General API rate limit: 100 requests per 15 minutes
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }),

  // Authentication rate limit: 5 attempts per 15 minutes
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
      return `auth_limit:${ip}`;
    },
  }),

  // File upload rate limit: 10 uploads per hour
  upload: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
      return `upload_limit:${ip}`;
    },
  }),

  // Search rate limit: 30 searches per minute
  search: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyGenerator: (request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
      return `search_limit:${ip}`;
    },
  }),
};

// Middleware function to apply rate limiting
export function withRateLimit(
  rateLimiter: ReturnType<typeof createRateLimit>,
  handler: (request: NextRequest, context: any) => Promise<Response>
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    const { allowed, resetTime, remaining } = rateLimiter.check(request);

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      throw RateLimitError(
        `Too many requests. Try again in ${retryAfter} seconds.`
      );
    }

    // Add rate limit headers to response
    const response = await handler(request, context);
    
    response.headers.set('X-RateLimit-Limit', rateLimiter.check(request).remaining.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

    return response;
  };
}

// User-specific rate limiting (requires authentication)
export function createUserRateLimit(config: RateLimitConfig & { getUserId: (request: NextRequest) => string | null }) {
  const baseRateLimit = createRateLimit({
    ...config,
    keyGenerator: (request) => {
      const userId = config.getUserId(request);
      if (userId) {
        return `user_limit:${userId}`;
      }
      // Fall back to IP-based limiting for unauthenticated users
      const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
      return `ip_limit:${ip}`;
    },
  });

  return baseRateLimit;
}

// Adaptive rate limiting based on server load
export function createAdaptiveRateLimit(baseConfig: RateLimitConfig) {
  return createRateLimit({
    ...baseConfig,
    maxRequests: Math.floor(baseConfig.maxRequests * getServerLoadFactor()),
  });
}

function getServerLoadFactor(): number {
  // Simple CPU-based load factor (in production, use proper monitoring)
  const loadAvg = process.cpuUsage();
  const totalUsage = loadAvg.user + loadAvg.system;
  
  // Reduce rate limit if CPU usage is high
  if (totalUsage > 80) return 0.5;
  if (totalUsage > 60) return 0.7;
  if (totalUsage > 40) return 0.9;
  
  return 1.0;
}

// Rate limit bypass for trusted sources
export function createBypassableRateLimit(
  config: RateLimitConfig,
  bypassChecker: (request: NextRequest) => boolean
) {
  const baseRateLimit = createRateLimit(config);

  return {
    check: (request: NextRequest) => {
      if (bypassChecker(request)) {
        return { allowed: true, resetTime: Date.now() + config.windowMs, remaining: config.maxRequests };
      }
      return baseRateLimit.check(request);
    },
    increment: baseRateLimit.increment,
    reset: baseRateLimit.reset,
  };
}
