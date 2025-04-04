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
    callbackUri: `${process.env.API_BASE_URL}/auth/login/google/callback`
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
    callbackUri: `${process.env.API_BASE_URL}/auth/login/microsoft/callback`,
    tenant: process.env.MICROSOFT_TENANT_ID || 'common'
  });

  // Google OAuth routes
  fastify.get('/login/google/callback', async function (request, reply) {
    try {
      const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      }).then(res => res.json());

      const user = await AuthService.handleOAuthUser({
        email: userInfo.email,
        firstname: userInfo.given_name,
        lastname: userInfo.family_name,
        provider: 'google',
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
