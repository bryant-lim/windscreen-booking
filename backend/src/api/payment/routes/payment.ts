
export default {
  routes: [
    {
      method: "POST",
      path: "/payment/initiate",
      handler: "payment.initiate",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/payment/verify",
      handler: "payment.verify",
      config: {
        auth: false,
      },
    },
  ],
};
