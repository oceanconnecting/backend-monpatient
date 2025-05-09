// plugins/google-oauth.js
import fp from "fastify-plugin";
import oauthPlugin from "@fastify/oauth2";

export default fp(async function (fastify) {
  // Log the OAuth configuration

  console.log(
    "Callback URL:",
    process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:3000/api/auth/login/google/callback"
  );

  fastify.register(oauthPlugin, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/api/auth/login/google",
    callbackUri:
      process.env.GOOGLE_CALLBACK_URL||
      "http://localhost:3000/api/auth/login/google/callback",
  });
  // Add a route to check if the OAuth plugin is properly registered
 
});
