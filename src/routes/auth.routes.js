import { AuthService } from "../services/auth/auth.service.js";
import { PrismaClient } from "@prisma/client";
import oauthPlugin from "@fastify/oauth2"; 

const prisma = new PrismaClient();

export async function authRoutes(fastify) {
  // Google OAuth configuration
  fastify.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['openid', 'profile', 'email'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID, // Fixed environment variable name
        secret: process.env.GOOGLE_CLIENT_SECRET // Fixed environment variable name
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/login/google',
    callbackUri: `${process.env.API_BASE_URL}/auth/login/google/callback`, // Use environment variable for base URL
    pkce: 'S256'
  });
  
  // Microsoft OAuth configuration
  fastify.register(oauthPlugin, {
    name: "microsoftOAuth2",
    credentials: {
      client: {
        id: process.env.MICROSOFT_CLIENT_ID,
        secret: process.env.MICROSOFT_CLIENT_SECRET,
      },
      auth: oauthPlugin.MICROSOFT_CONFIGURATION,
    },
    scope: ["openid", "profile", "email"],
    startRedirectPath: "/login/microsoft",
    callbackUri: `${process.env.API_BASE_URL}/auth/login/microsoft/callback`,
    tenant: process.env.MICROSOFT_TENANT_ID || "common",
    state: true,
    generateStateFunction: () => {
      return Math.random().toString(36).substring(2, 15);
    },
    checkStateFunction: (state, callback) => {
      callback(null, true);
    },
  });

  // Add a route to check OAuth configuration
  fastify.get("/oauth-config", async (request, reply) => {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ? "configured" : "missing",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "configured" : "missing",
        callbackUrl: `${process.env.API_BASE_URL}/login/google/callback`, // Fixed callback URL
        apiBaseUrl: process.env.API_BASE_URL,
      },
      microsoft: { // Added Microsoft config info
        clientId: process.env.MICROSOFT_CLIENT_ID ? "configured" : "missing",
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET ? "configured" : "missing",
        callbackUrl: `${process.env.API_BASE_URL}/auth/login/microsoft/callback`,
        tenantId: process.env.MICROSOFT_TENANT_ID || "common"
      }
    };
  });

  // Google OAuth callback route
  fastify.get("/login/google/callback", async function (request, reply) {
    try {
      fastify.log.info("Starting Google OAuth callback");
      
      // Attempt to get access token from Google
      const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
  
      if (!token || !token.access_token) {
        fastify.log.error("No access token received from Google");
        return reply.code(400).send({
          success: false,
          error: "Failed to get access token from Google",
        });
      }
  
      // Get user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            Accept: "application/json",
          },
        }
      );
  
      if (!userInfoResponse.ok) {
        const errorData = await userInfoResponse.json();
        fastify.log.error("Failed to fetch user info", {
          status: userInfoResponse.status,
          error: errorData,
        });
        return reply.code(400).send({
          success: false,
          error: "Failed to fetch user info from Google",
        });
      }
  
      const userInfo = await userInfoResponse.json();
  
      if (!userInfo.email) {
        fastify.log.error("No email provided by Google");
        return reply.code(400).send({
          success: false,
          error: "Email not provided by Google",
        });
      }
  
      // Create or update user in your database
      const user = await AuthService.handleOAuthUser({
        email: userInfo.email,
        firstname: userInfo.given_name || "",
        lastname: userInfo.family_name || "",
        provider: "google",  // Make sure this is exactly 'google'
        providerId: userInfo.id,
      });
  
      // Generate JWT token
      const jwtToken = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });
  
      // Set cookie for web clients
      reply.setCookie("token", jwtToken, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      });

      // Handle different client types
      if (request.query.redirect === "web") {
        return reply.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${jwtToken}`);
      }
      
      // Default: return JSON response for API clients
      return {
        success: true,
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role,
        },
      };
    } catch (error) {
      fastify.log.error("Google OAuth error:", error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Microsoft OAuth callback route
  fastify.get("/login/microsoft/callback", async function (request, reply) {
    try {
      const { token } = await this.microsoftOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      if (!token || !token.access_token) {
        fastify.log.error("No access token received from Microsoft");
        return reply.code(400).send({
          success: false,
          error: "Failed to get access token from Microsoft",
        });
      }

      const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const errorData = await userInfoResponse.json();
        fastify.log.error("Failed to fetch user info from Microsoft", {
          status: userInfoResponse.status,
          error: errorData,
        });
        return reply.code(400).send({
          success: false,
          error: "Failed to fetch user info from Microsoft",
        });
      }

      const userInfo = await userInfoResponse.json();
      
      // Use mail or userPrincipalName as email
      const email = userInfo.mail || userInfo.userPrincipalName;
      if (!email) {
        fastify.log.error("No email provided by Microsoft");
        return reply.code(400).send({
          success: false,
          error: "Email not provided by Microsoft",
        });
      }

      const user = await AuthService.handleOAuthUser({
        email: email,
        firstname: userInfo.givenName || "",
        lastname: userInfo.surname || "",
        provider: "microsoft",
        providerId: userInfo.id,
      });

      const jwtToken = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set cookie for web clients
      reply.setCookie("token", jwtToken, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      });

      // Handle different client types
      if (request.query.redirect === "api") {
        return {
          success: true,
          token: jwtToken,
          user: {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            role: user.role,
          },
        };
      }
      
      // Default: redirect to frontend
      return reply.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${jwtToken}`);
    } catch (error) {
      fastify.log.error("Microsoft OAuth error:", error);
      if (request.query.redirect === "api") {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  });

  // Registration route
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
                  },
                  additionalProperties: true,
                },
              },
            },
            token: { type: "string" },
          },
        },
        400: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
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

  // Login route
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
                  },
                  additionalProperties: true,
                },
              },
            },
            token: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
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

  // Protected route to get current user
  fastify.get("/me", {
    onRequest: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
            firstname: { type: "string" },
            lastname: { type: "string" },
            profile: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        404: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        500: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
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
          return reply.code(404).send({ error: "User not found" });
        }

        return AuthService.formatUserResponse(user);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  });

  // Test endpoint to check if token is valid
  fastify.get("/test-auth", {
    onRequest: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            user: { 
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
              },
              additionalProperties: true,
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      return {
        success: true,
        message: "Authentication successful",
        user: request.user,
      };
    },
  });

  // Email verification route
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
        400: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { token } = request.body;
        const result = await AuthService.verifyEmail(token);
        return result;
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          error: "Email verification failed",
          message: error.message,
        });
      }
    },
  });
}