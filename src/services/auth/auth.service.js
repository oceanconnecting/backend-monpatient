import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();
const generateToken = () => crypto.randomBytes(20).toString("hex");
export class AuthService {
  constructor(mailer) {
    this.mailer = mailer;
  }
  static async hashPassword(password) {
    return bcryptjs.hash(password, 10);
  }
  static async loginWithGoogle(googleUserData) {
    try {
      // Check if user exists with this email
      let user = await prisma.user.findUnique({
        where: { email: googleUserData.email },
        include: {
          patient: true,
          nurse: true,
          doctor: true,
          pharmacy: true,
          admin: true,
        },
      });

      if (user) {
        console.log("User found with email:", googleUserData.email);
        // User exists, update Google ID if not set
        if (!user.googleId) {
          console.log("Updating user with Google ID and profile photo");
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleUserData.googleId,
              isEmailVerified: true, // Google has verified this email
              profilePhoto: googleUserData.picture || user.profilePhoto,
            },
            include: {
              patient: true,
              nurse: true,
              doctor: true,
              pharmacy: true,
              admin: true,
            },
          });
        }
      } else {
        console.log("Creating new user with Google data");
        // Create new user with Google data
        // For new Google users, we'll set them as PATIENT by default
        // You may want to change this or add a step where they choose their role
        const roleData = this.getRoleSpecificData({ role: "PATIENT" });

        user = await prisma.user.create({
          data: {
            email: googleUserData.email,
            firstname: googleUserData.firstname,
            lastname: googleUserData.lastname,
            googleId: googleUserData.googleId,
            role: "PATIENT", // Default role for Google sign-ups
            isEmailVerified: true, // No need to verify email from Google
            password: await this.hashPassword(
              crypto.randomBytes(20).toString("hex")
            ), // Random password as they'll use Google to sign in
            profilePhoto: googleUserData.picture,
            patient: {
              create: roleData,
            },
          },
          include: {
            patient: true,
            nurse: true,
            doctor: true,
            pharmacy: true,
            admin: true,
          },
        });
      }

      return this.formatUserResponse(user);
    } catch (error) {
      console.error("Google authentication error:", error);
      throw new Error("Google authentication failed: " + error.message);
    }
  }
  static async verifyPassword(password, hash) {
    return bcryptjs.compare(password, hash);
  }
  static async formatUserResponse(user) {
    const {  ...userBase } = user; // Exclude 'password' without assigning it
    const roleData = user[user.role.toLowerCase()];

    return {
      ...userBase,
      profile: roleData,
    };
  }
  static validateUserInput(userData) {
    // Required fields validation
    const requiredFields = [
      "email",
      "firstname",
      "lastname",
      "password",
      "role",
    ];
    const missingFields = requiredFields.filter((field) => !userData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Email format validation
    const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error("Invalid email format");
    }

    // Password strength validation (min 8 chars, 1 number, 1 uppercase)
    const passwordRegex = /^(?=.*\d)(?=.*[A-Z]).{8,}$/;
    if (userData.role !== "ADMIN" && !passwordRegex.test(userData.password)) {
      throw new Error(
        "Password must be at least 8 characters with 1 number and 1 uppercase letter"
      );
    }

    // Role validation
    const validRoles = ["PATIENT", "NURSE", "DOCTOR", "PHARMACY", "ADMIN"];
    if (!validRoles.includes(userData.role)) {
      throw new Error("Invalid user role");
    }

    // Role-specific field validation
    // if (userData.role === 'DOCTOR' && !userData.specialization) {
    //   throw new Error('Specialization is required for doctors')
    // }
  }
  static async register(userData) {
    try {
      this.validateUserInput(userData); // Moved inside try block

      const hashedPassword = await this.hashPassword(userData.password);

      let verificationData = {};
      if (userData.role !== "ADMIN") {
        verificationData = {
          isEmailVerified: false,
          emailVerificationToken: generateToken(),
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      } else {
        verificationData = { isEmailVerified: true };
      }

      const roleData = this.getRoleSpecificData(userData);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstname: userData.firstname,
          lastname: userData.lastname,
          role: userData.role,
          ...verificationData,
          [userData.role.toLowerCase()]: {
            create: roleData,
          },
        },
        include: {
          patient: true,
          nurse: true,
          doctor: true,
          pharmacy: true,
          admin: true,
        },
      });
      if (userData.role !== "ADMIN") {
        await this.sendVerificationEmail(
          user.email,
          user.emailVerificationToken
        );
      }

      return this.formatUserResponse(user);
    } catch (error) {
      if (error.code === "P2002") {
        throw new Error("Email already exists");
      }
      // Check if the error is a validation error to avoid wrapping its message
      if (
        error.message.startsWith("Missing") ||
        error.message.startsWith("Invalid") ||
        error.message.startsWith("Password")
      ) {
        throw error; // Re-throw validation errors without modification
      }
      console.error("Registration error:", error);
      throw new Error("Registration failed: " + error.message);
    }
  }
  static async sendVerificationEmail(email, token) {
    try {
      // Create a transporter using SMTP settings (Gmail example)
      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.com", // Zoho's SMTP server
        port: 465, // SSL port
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // Your Zoho Mail address (e.g., user@yourdomain.com)
          pass: process.env.SMTP_PASSWORD, // Your Zoho Mail password or app-specific password
        },
      });

      // Email content
      const mailOptions = {
        from: "team@oceanconnecting.dev", // Sender address
        to: email, // Recipient address
        subject: "Verify Your Email", // Subject line
        text: `Verification  your account.`, // Plain text body
        html: `
          <h1>Monpatient</h1>
          <p>Use this Link to verify your account:${token}</p>
          <a href=https://localhost:5173/auth/verification-success?token=${token}">Verify Email</a>
        `, // HTML body
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      console.log("Verification email sent successfully");
    } catch (error) {
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }
  static getRoleSpecificData(userData) {
    return {
      ...(userData.role === "PATIENT" && {}),
      ...(userData.role === "DOCTOR" && {
        specialization: userData.specialization,
      }),
      ...(userData.role === "PHARMACY" && {}),
      ...(userData.role === "NURSE" && {
        availability: true,
        rating: 0,
      }),
      ...(userData.role === "ADMIN" && {}),
    };
  }
  static async verifyEmail(token) {
    try {
      // Find the user by email verification token and ensure the token is not expired
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date(), // The token must still be valid (not expired)
          },
        },
      });

      if (!user) {
        throw new Error("Invalid or expired verification token");
      }

      // Update the user's email verification status and reset token and expiry fields
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      return { message: "Email verified successfully" };
    } catch (error) {
      console.error("Failed to verify email:", error);
      throw new Error("Email verification failed: " + error.message);
    }
  }
  static async resetPassword(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const token = generateToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await this.sendResetPasswordEmail(email, token);
    } catch (error) {
      console.error("Failed to reset password:", error);
      throw new Error("Password reset failed: " + error.message);
    }
  }
  static async sendResetPasswordEmail(email, token) {
    try {
      // Create a transporter using SMTP settings (Zoho example)
      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.com", // Zoho's SMTP server
        port: 465, // SSL port
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER, // Your Zoho Mail address
          pass: process.env.SMTP_PASSWORD, // Your Zoho Mail password or app-specific password
        },
      });
  
      // Email content
      const mailOptions = {
        from: "team@oceanconnecting.dev", // Sender address
        to: email, // Recipient address
        subject: "Reset Your Password", // Subject line
        text: `Use this token to reset your password: ${token}`, // Plain text body
        html: `
          <h1>Monpatient</h1>
          <p>You requested a password reset. Use the link below to reset your password:</p>
          <a href="https://localhost:5173/auth/reset-password?token=${token}">Reset Password</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        `, // HTML body
      };
  
      // Send the email
      await transporter.sendMail(mailOptions);
      console.log("Password reset email sent successfully");
      return { message: "Password reset email sent successfully" };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Failed to send password reset email: " + error.message);
    }
  } // Your Zoho Mail address (e.g.,
  static async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        patient: {
          include:{
            user:{
              select:{
                lat:true,
                long:true,
                address:true
              }
            }
          }
        },
        nurse:  {
          include:{
            user:{
              select:{
                lat:true,
                long:true,
                address:true
              }
            }
          }
        },
        doctor:  {
          include:{
            user:{
              select:{
                lat:true,
                long:true,
                address:true
              }
            }
          }
        },
        pharmacy:  {
          include:{
            user:{
              select:{
                lat:true,
                long:true,
                address:true
              }
            }
          }
        },
        admin: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const validPassword = await this.verifyPassword(password, user.password);
    if (!validPassword) {
      throw new Error("Invalid password");
    }

    return this.formatUserResponse(user);
  }

}
