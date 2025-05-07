import { AuthService } from "../services/auth/auth.service.js";
import { PrismaClient } from "@prisma/client";
import sget from "simple-get";
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
  fastify.get("/login/google/callback", async function (request, reply) {
    try {
      // Log the request query parameters for debugging
      fastify.log.info(
        "Google OAuth callback received with query params:",
        request.query
      );

      // Check for error in the response
      if (request.query.error) {
        fastify.log.error(`Google OAuth error: ${request.query.error}`);
        fastify.log.error(
          `Error details: ${request.query.error_description || "No details provided"}`
        );
        return reply.code(401).send({
          error: "Google authentication failed",
          message: request.query.error_description || request.query.error,
        });
      }

      // Get the authorization token from Google
      fastify.log.info(
        "Attempting to get access token from authorization code flow"
      );
      const { token } =
        await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );
      fastify.log.info("Successfully obtained access token");

      // Get the user's profile from Google using simple-get
      fastify.log.info("Fetching user profile from Google");
      const googleUser = await new Promise((resolve, reject) => {
        sget.concat(
          {
            url: "https://www.googleapis.com/oauth2/v2/userinfo",
            method: "GET",
            headers: {
              Authorization: `Bearer ${token.access_token}`,
            },
            json: true,
          },
          (error, response, data) => {
            if (error) {
              fastify.log.error("Error fetching user profile:", error);
              return reject(error instanceof Error ? error : new Error(error.message || String(error)));
            }
            if (response.statusCode !== 200) {
              fastify.log.error(
                `Request failed with status code ${response.statusCode}`
              );
              return reject(
                new Error(
                  `Request failed with status code ${response.statusCode}`
                )
              );
            }
            fastify.log.info("Successfully fetched user profile:", data);
            resolve(data);
          }
        );
      });

      // Use our AuthService to handle Google login
      fastify.log.info("Processing Google login with user data");
      const user = await AuthService.loginWithGoogle({
        email: googleUser.email,
        firstname: googleUser.given_name || googleUser.name.split(" ")[0],
        lastname:
          googleUser.family_name ||
          googleUser.name.split(" ").slice(1).join(" "),
        googleId: googleUser.id,
        picture: googleUser.picture,
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
      fastify.log.info("Redirecting to frontend with token");
      return reply.redirect(
        `${process.env.FRONTEND_URL}/?token=${jwtToken}`
      );
    } catch (error) {
      fastify.log.error("Google authentication error:", error);
      reply.code(401).send({
        error: "Google authentication failed",
        message: error.message,
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
          select: {
            // User fields you want to include
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            profilePhoto: true,
            role: true,
            isEmailVerified: true,
            telephoneNumber: true,
            dateOfBirth: true,
            gender: true,
            // Include relations but NOT password
            patient: true,
            nurse: true,  
            doctor: true,
            pharmacy: true,
            admin: true,
          }
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
