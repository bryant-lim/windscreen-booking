
export default {
  // CRON Task for reminders (Runs daily at 9:00 AM)
  reminderTask: {
    task: async ({ strapi }: { strapi: any }) => {
      const today = new Date();
      
      const targets = [
        { days: 2, label: '48-hour Reminder' },
        { days: 7, label: '7-day Reminder' }
      ];

      for (const target of targets) {
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + target.days);
        const dateStr = targetDate.toISOString().split('T')[0];

        try {
          const bookings = await strapi.documents('api::booking.booking').findMany({
            filters: {
              AppointmentDate: dateStr,
              Status: 'Confirmed'
            },
            populate: ['BranchName']
          });

          for (const booking of bookings) {
            if (!booking.Email) continue;

            try {
              await strapi.plugins['email'].services.email.send({
                to: booking.Email,
                subject: `Appointment Reminder: ${dateStr} (${target.label})`,
                html: `
                  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #f1f5f9; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(30,58,95,0.05);">
                    <div style="text-align: center; margin-bottom: 20px;">
                       <img src="https://booking.windscreen2u.com/logo.png" alt="Windscreen2u" style="height: 50px;" />
                    </div>
                    <h2 style="color: #1e3a5f; text-align: center;">Appointment Reminder</h2>
                    <p>Hi <strong>${booking.DriverName}</strong>,</p>
                    <p>This is a friendly reminder for your upcoming appointment with Windscreen2u.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                       <p style="margin: 5px 0;"><strong>Reference:</strong> ${booking.ReferenceNumber}</p>
                       <p style="margin: 5px 0;"><strong>Date:</strong> ${booking.AppointmentDate}</p>
                       <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.AppointmentTime}</p>
                       <p style="margin: 5px 0;"><strong>Branch:</strong> ${booking.BranchName?.BranchName || 'Assigned Branch'}</p>
                    </div>
                    <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #64748b;">We look forward to seeing you! If you need to reschedule, please let us know as soon as possible.</p>
                  </div>
                `
              });
              console.log(`Cron sent ${target.label} to ${booking.Email}`);
            } catch (emailErr) {
              console.error(`Cron Email Error for ${booking.ReferenceNumber}:`, emailErr);
            }
          }
        } catch (dbErr) {
          console.error(`Cron DB Error for ${dateStr}:`, dbErr);
        }
      }
    },
    options: {
      rule: '0 9 * * *', // Daily at 9 AM
    },
  },
};
