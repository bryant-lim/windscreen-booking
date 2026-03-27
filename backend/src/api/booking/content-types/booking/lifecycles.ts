
export default {
  async afterUpdate(event) {
    const { result, params } = event;
    const { data } = params;

    // Check if Status was changed
    if (data && data.Status) {
      const customerEmail = result.Email;
      const newStatus = result.Status;
      const ref = result.ReferenceNumber;
      const reason = result.CancellationReason;

      console.log(`--- SYSTEM NOTIFICATION ---`);
      console.log(`To: ${customerEmail}`);
      console.log(`Subject: Your Booking ${ref} Status Update: ${newStatus}`);
      console.log(`Content: Your booking status for ${ref} has been updated to ${newStatus}.`);
      if (newStatus === 'Cancelled' && reason) {
        console.log(`Reason for cancellation: ${reason}`);
      }
      console.log(`--- END NOTIFICATION ---`);

      /* 
      TODO: To enable real emails, install @strapi/plugin-email and use:
      await strapi.plugins['email'].services.email.send({
        to: customerEmail,
        subject: `Appointment Update: ${newStatus} (${ref})`,
        text: `Your appointment ${ref} is now ${newStatus}. ${reason ? `Reason: ${reason}` : ''}`,
        html: `<h4>Update for Booking #${ref}</h4><p>Current Status: <strong>${newStatus}</strong></p> ${reason ? `<p>Note: ${reason}</p>` : ''}`
      });
      */
    }
  },
};
