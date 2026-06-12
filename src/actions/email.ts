import { createServerFn } from '@tanstack/react-start';
import nodemailer from 'nodemailer';

export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .validator((data: { email: string; name: string; tempPass: string }) => data)
  .handler(async ({ data }) => {
    console.log("Preparing to send email to:", data.email);
    
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"LAMS HR System" <${process.env.SMTP_USER}>`,
        to: data.email,
        subject: 'Welcome to LAMS - Your Login Credentials',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #0f172a;">Welcome to LAMS, ${data.name}!</h2>
            <p style="color: #334155;">Your HR Administrator has created a new account for you.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0;"><strong>Login URL:</strong> <a href="http://localhost:8080/login" style="color: #0284c7;">http://localhost:8080/login</a></p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${data.email}</p>
              <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${data.tempPass}</code></p>
            </div>
            
            <p style="color: #b45309; background: #fffbeb; padding: 12px; border-radius: 6px; border: 1px solid #fef3c7; font-size: 14px;">
              <strong>⚠️ Important First Step:</strong> Upon your first login, please navigate to <b>My Profile</b> to register your Biometric Face ID. Attendance tracking requires a registered face vector.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.response);
      return { success: true, message: 'Email sent successfully' };
    } catch (error: any) {
      console.error('CRITICAL Error sending email via Nodemailer:', error);
      throw new Error('Failed to send email: ' + error.message);
    }
  });
