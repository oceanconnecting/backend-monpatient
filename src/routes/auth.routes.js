import { AuthService } from "../services/auth/auth.service.js";
import { PrismaClient } from "@prisma/client";
import fastifyOauth2 from '@fastify/oauth2';

const prisma = new PrismaClient();

export async function authRoutes(fastify) {
  fastify.register(fastifyOauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION
    },
    scope: ['profile', 'email'],
    startRedirectPath: '/login/google',
    callbackUri: 'http://localhost:3000/api/auth/login/google/callback',
    state: true, // Enable state parameter for security
    generateStateFunction: () => {
      return Math.random().toString(36).substring(2, 15);
    },
    checkStateFunction: (state, callback) => {
      // For testing purposes, we're accepting any state value
      callback(null, true);
    }
  });

  // Register OAuth2 plugin for Microsoft
  fastify.register(fastifyOauth2, {
    name: 'microsoftOAuth2',
    credentials: {
      client: {
        id: process.env.MICROSOFT_CLIENT_ID,
        secret: process.env.MICROSOFT_CLIENT_SECRET
      },
      auth: fastifyOauth2.MICROSOFT_CONFIGURATION
    },
    scope: ['openid', 'profile', 'email'],
    startRedirectPath: '/login/microsoft',
    callbackUri: `${process.env.API_BASE_URL}/login/microsoft/callback`,
    tenant: process.env.MICROSOFT_TENANT_ID || 'common',
    state: true,
    generateStateFunction: () => {
      return Math.random().toString(36).substring(2, 15);
    },
    checkStateFunction: (state, callback) => {
      // For testing purposes, we're accepting any state value
      callback(null, true);
    }
  });

  // Add a route to check OAuth configuration
  fastify.get('/oauth-config', async (request, reply) => {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing',
        callbackUrl: 'http://localhost:3000/api/auth/login/google/callback',
        frontendUrl: process.env.FRONTEND_URL
      }
    };
  });

  // Google OAuth routes
  fastify.get('/login/google/callback', async function (request, reply) {
    try {
      fastify.log.info('Starting Google OAuth callback');
      
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        fastify.log.error('Google OAuth credentials not configured');
        return reply.code(400).send({
          success: false,
          error: 'OAuth credentials not configured'
        });
      }
      
      const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      if (!token || !token.access_token) {
        fastify.log.error('No access token received from Google');
        return reply.code(400).send({
          success: false,
          error: 'Failed to get access token from Google'
        });
      }

      fastify.log.info('Successfully received access token from Google');

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      });

      if (!userInfoResponse.ok) {
        fastify.log.error('Failed to fetch user info', { status: userInfoResponse.status });
        return reply.code(400).send({
          success: false,
          error: 'Failed to fetch user info from Google'
        });
      }

      const userInfo = await userInfoResponse.json();
      fastify.log.info('Successfully fetched user info from Google');

      if (!userInfo.email) {
        fastify.log.error('No email provided by Google');
        return reply.code(400).send({
          success: false,
          error: 'Email not provided by Google'
        });
      }

      const user = await AuthService.handleOAuthUser({
        email: userInfo.email,
        firstname: userInfo.given_name || '',
        lastname: userInfo.family_name || '',
        provider: 'google',
        providerId: userInfo.id
      });

      fastify.log.info('Successfully created/updated user', { userId: user.id });

      const jwtToken = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set cookie and return JSON response for testing
      reply.setCookie('token', jwtToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      });

      return {
        success: true,
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role
        },
        googleUserInfo: userInfo
      };

    } catch (error) {
      fastify.log.error('Google OAuth error:', error);
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Microsoft OAuth routes
  fastify.get('/login/microsoft/callback', async function (request, reply) {
    try {
      const { token } = await this.microsoftOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      const userInfo = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }).then(res => res.json());

      const user = await AuthService.handleOAuthUser({
        email: userInfo.mail || userInfo.userPrincipalName,
        firstname: userInfo.givenName,
        lastname: userInfo.surname,
        provider: 'microsoft',
        providerId: userInfo.id
      });

      const jwtToken = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set cookie and redirect or return token
      reply.setCookie('token', jwtToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      });

      reply.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${jwtToken}`);
    } catch (error) {
      fastify.log.error(error);
      reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  });
  fastify.post("/register", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password", "firstname", "lastname", "role"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          firstname: { type: "string" },
          lastname: { type: "string" },
          role: {
            type: "string",
            enum: ["PATIENT", "NURSE", "DOCTOR", "PHARMACY", "ADMIN"],
          },
          specialization: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
                isEmailVerified: { type: "boolean" },
                emailVerificationToken: { type: "string" },
                emailVerificationExpires: { type: "string" },
                firstname: { type: "string" },
                lastname: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
                profile: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    // Other properties will be included based on role
                  },
                  additionalProperties: true,
                },
              },
            },
            token: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const user = await AuthService.register(request.body);
        const token = fastify.jwt.sign({
          id: user.id,
          email: user.email,
          role: user.role,
        });

        return { user, token };
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({
          error: "Registration failed",
          message: error.message,
        });
      }
    },
  });
  fastify.post("/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
                createdAt: { type: "string" },
                firstname: { type: "string" },
                profilePhoto: { type: "string" },
                lastname: { type: "string" },
                isEmailVerified: { type: "boolean" },
                emailVerificationToken: { type: "string" },
                emailVerificationExpires: { type: "string" },
                updatedAt: { type: "string" },
                profile: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    // Other properties will be included based on role
                  },
                  additionalProperties: true,
                },
              },
            },
            token: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { email, password } = request.body;
        const user = await AuthService.login(email, password);
        const token = fastify.jwt.sign({
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role,
        });

        return { user, token };
      } catch (error) {
        fastify.log.error(error);
        reply.code(401).send({
          error: "Authentication failed",
          message: error.message,
        });
      }
    },
  });
  // Protected route example
  fastify.get("/me", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user.id },
          include: {
            patient: true,
            nurse: true,
            doctor: true,
            pharmacy: true,
            admin: true,
          },
        });

        if (!user) {
          reply.code(404).send({ error: "User not found" });
          return;
        }

        return AuthService.formatUserResponse(user);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({ error: "Internal server error" });
      }
    },
  });
  
  // Test endpoint to check if token is valid
  fastify.get("/test-auth", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      return {
        success: true,
        message: "Authentication successful",
        user: request.user
      };
    },
  });

  fastify.post("/verify-email", {
    schema: {
      body: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { token } = request.body;
        const result = await AuthService.verifyEmail(token);
        reply.code(200).send(result);
      } catch (error) {
        fastify.log.error(error);
        reply.code(400).send({
          error: "Email verification failed",
          message: error.message,
        });
      }
    },
  });
}
