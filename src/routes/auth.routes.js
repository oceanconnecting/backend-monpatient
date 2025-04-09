import { AuthService } from "../services/auth/auth.service.js";
import { PrismaClient } from "@prisma/client";
import sget from 'simple-get'
const prisma = new PrismaClient();

export async function authRoutes(fastify) {
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
                ValidityState: { type: "string" },
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
  fastify.get("/login/google", async (request, reply) => {
    // Redirect to Google OAuth consent screen
    const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/login/google/callback";
    const scope = "profile email";
    request.session.state = state;
    const authUrl = `${authorizationEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    
    reply.redirect(authUrl);
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
    // Google OAuth callback handler
  fastify.get("/login/google/callback", async function(request, reply) {
          try {
            // Get the authorization token from Google
            if (!request.query.state || request.query.state !== request.session.state) {
              throw new Error('Invalid state');
            }
            if (request.query.error) {
              fastify.log.error(`Google OAuth error: ${request.query.error}`);
              fastify.log.error(`Error details: ${request.query.error_description || 'No details provided'}`);
              return reply.code(401).send({
                error: "Google authentication failed",
                message: request.query.error_description || request.query.error
              });
            }
            const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
            
            // Get the user's profile from Google using simple-get
            const googleUser = await new Promise((resolve, reject) => {
              sget.concat({
                url: 'https://www.googleapis.com/oauth2/v2/userinfo',
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${token.access_token}`
                },
                json: true
              }, (error, response, data) => {
                if (error) return reject(error);
                if (response.statusCode !== 200) {
                  return reject(new Error(`Request failed with status code ${response.statusCode}`));
                }
                resolve(data);
              });
            });
            
            // Use our AuthService to handle Google login
            const user = await AuthService.loginWithGoogle({
              email: googleUser.email,
              firstname: googleUser.given_name || googleUser.name.split(' ')[0],
              lastname: googleUser.family_name || googleUser.name.split(' ').slice(1).join(' '),
              googleId: googleUser.id,
            });
            
            // Generate JWT token
            const jwtToken = fastify.jwt.sign({
              id: user.id,
              email: user.email,
              firstname: user.firstname,
              lastname: user.lastname,
              role: user.role,
            });
            
            // Redirect to frontend with token
            // In production, you should use a more secure approach
            return reply.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${jwtToken}`);
          } catch (error) {
            fastify.log.error(error);
            reply.code(401).send({
              error: "Google authentication failed",
              message: error.message
            });
          }
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
