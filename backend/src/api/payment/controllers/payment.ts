
import Razorpay from 'razorpay';
import { factories } from '@strapi/strapi';

export default {
  async initiate(ctx) {
    const { amount, reference } = ctx.request.body;

    if (!amount) {
      return ctx.badRequest('Amount is required');
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_p0yN6U78aOq7Wf', // Fallback for testing if not in .env yet
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    try {
      const options = {
        amount: Math.round(amount * 100), // convert to cents/sen
        currency: "MYR",
        receipt: reference || `rcpt_${Date.now()}`,
      };

      const order = await instance.orders.create(options);
      return ctx.send({
        ...order,
        razorpay_key: process.env.RAZORPAY_KEY_ID || 'rzp_test_p0yN6U78aOq7Wf'
      });
    } catch (error) {
      console.error("Razorpay Order Creation Error:", error);
      return ctx.internalServerError(error.message);
    }
  },

  async verify(ctx) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = ctx.request.body;
    const crypto = require('crypto');
    
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      return ctx.send({ status: 'verified' });
    } else {
      return ctx.badRequest('Invalid signature');
    }
  }
};
