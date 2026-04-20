export default ({ env }: any) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.resend.com'),
        port: env.int('SMTP_PORT', 465),
        secure: true,
        auth: {
          user: 'resend',
          pass: env('RESEND_API_KEY'),
        },
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM', 'onboarding@resend.dev'),
        defaultReplyTo: env('EMAIL_DEFAULT_REPLY_TO', 'onboarding@resend.dev'),
      },
    },
  },
});
