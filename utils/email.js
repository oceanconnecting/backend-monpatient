import fastify from 'fastify';
import fastifyMailer from 'fastify-mailer';

const app = fastify();

// Register the fastify-mailer plugin
app.register(fastifyMailer, {
  transport: {
    host: 'smtp.example.com', // Replace with your SMTP host
    port: 587,               // Common SMTP port
    secure: false,           // Use TLS
    auth: {
      user: 'zakaryabaouali2@gmail.com', // Your email address
      pass: 'zakaryabaouali2',    // Your email password
    },
  },
});

/**
 * Sends an email using fastify-mailer.
 * 
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 * @returns {Promise<void>}
 */
export const sendEmail = async (to, subject, html) => {
  try {
    await app.mailer.sendMail({
      from: 'zakaryabaouali255@gmail.com', // Sender info
      to,                                           // Recipient
      subject,                                      // Subject
      html,                                         // HTML body
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Could not send email');
  }
};
