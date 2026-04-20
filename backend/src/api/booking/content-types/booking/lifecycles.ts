
export default {
  async afterCreate(event: any) {
    const { result } = event;
    
    // Extract info
    const { 
      ReferenceNumber, 
      AppointmentDate, 
      AppointmentTime, 
      CarPlateNumber, 
      DriverName, 
      Email, 
      ICNumber, 
      VehicleDetailsJSON, 
      PaymentMode 
    } = result;

    // Handle BranchName relation (it might be an object or ID depending on Strapi's load)
    let branchLabel = 'Windscreen2u Branch';
    if (result.BranchName && result.BranchName.BranchName) {
      branchLabel = result.BranchName.BranchName;
    }

    const carInfo = VehicleDetailsJSON ? `${VehicleDetailsJSON.make} ${VehicleDetailsJSON.model} (${VehicleDetailsJSON.year})` : 'N/A';
    const priceType = VehicleDetailsJSON?.priceType || 'N/A';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@windscreen2u.com';

    // 1. Send to Customer
    try {
      if (Email) {
        await strapi.plugins['email'].services.email.send({
          to: Email,
          subject: `Booking Confirmation - ${ReferenceNumber}`,
          html: `
            <div style="font-family: 'Inter', sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #f1f5f9; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(30,58,95,0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                 <img src="https://booking.windscreen2u.com/logo.png" alt="Windscreen2u" style="height: 50px;" />
              </div>
              <h1 style="color: #1e3a5f; text-align: center; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Booking Confirmed!</h1>
              <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 32px;">Hi <strong>${DriverName}</strong>, your appointment has been registered.</p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin: 20px 0;">
                 <h3 style="margin-top: 0; color: #1e3a5f; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;">Appointment Details</h3>
                 <table style="width: 100%; font-size: 14px; border-spacing: 0;">
                    <tr><td style="padding: 6px 0; color: #64748b;">Reference No</td><td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e3a5f;">${ReferenceNumber}</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Plate No</td><td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e3a5f;">${CarPlateNumber}</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e3a5f;">${AppointmentDate}</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Time</td><td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e3a5f;">${AppointmentTime}</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Branch</td><td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1e3a5f;">${branchLabel}</td></tr>
                 </table>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                 <a href="https://wa.me/60123456789" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Contact Support</a>
              </div>

              <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: center;">
                 <p style="font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em;">Copyright 2026 Windscreen2u</p>
              </div>
            </div>
          `
        });
      }
    } catch (err) {
      console.error('Email confirmation error (Customer):', err);
    }

    // 2. Send to Admin
    try {
      await strapi.plugins['email'].services.email.send({
        to: adminEmail,
        subject: `New Booking Alert: ${ReferenceNumber}`,
        html: `
          <div style="font-family: sans-serif; color: #1e3a5f; padding: 20px;">
            <h2 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Booking Alert</h2>
            <div style="margin-top: 20px; line-height: 1.6;">
               <p><strong>Customer:</strong> ${DriverName}</p>
               <p><strong>Car:</strong> ${carInfo}</p>
               <p><strong>Price Type:</strong> ${priceType}</p>
               <p><strong>IC Number:</strong> ${ICNumber}</p>
               <p><strong>Payment Mode:</strong> ${PaymentMode}</p>
               <p><strong>Reference:</strong> ${ReferenceNumber}</p>
            </div>
          </div>
        `
      });
    } catch (err) {
      console.error('Email alert error (Admin):', err);
    }
  },

  async afterUpdate(event: any) {
    const { result, params } = event;
    const { data } = params;

    // 1. Booking Status Change Notification
    if (data && data.Status && result.Email) {
      try {
        await strapi.plugins['email'].services.email.send({
          to: result.Email,
          subject: `Booking Status Updated: ${result.Status} (${result.ReferenceNumber})`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #f1f5f9; padding: 30px; border-radius: 16px;">
              <h2 style="color: #1e3a5f;">Booking Update</h2>
              <p>Hi <strong>${result.DriverName}</strong>,</p>
              <p>The status of your booking <strong>#${result.ReferenceNumber}</strong> has been updated to:</p>
              <div style="background: #eef2ff; color: #1e3a5f; padding: 15px; border-radius: 10px; font-size: 18px; font-weight: 800; text-align: center; margin: 20px 0;">
                ${result.Status}
              </div>
              <p style="font-size: 12px; color: #64748b;">If you have any questions, please contact our support team.</p>
            </div>
          `
        });
      } catch (err) {
        console.error('Status Update Email Error:', err);
      }
    }

    // 2. Booking Content Change Notification to Admin
    const isContentChange = data && (data.CarPlateNumber || data.AppointmentDate || data.AppointmentTime);
    if (isContentChange) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@windscreen2u.com';
      try {
        await strapi.plugins['email'].services.email.send({
          to: adminEmail,
          subject: `Booking Content Changed: ${result.ReferenceNumber}`,
          html: `
            <div style="font-family: sans-serif; color: #1e3a5f;">
              <h3>Booking Modified by Customer</h3>
              <p>Reference: <strong>#${result.ReferenceNumber}</strong></p>
              <p>Customer: <strong>${result.DriverName}</strong></p>
              <p>Please check the admin panel for updated details.</p>
            </div>
          `
        });
      } catch (err) {
        console.error('Content Change Admin Alert Error:', err);
      }
    }
  }
};
