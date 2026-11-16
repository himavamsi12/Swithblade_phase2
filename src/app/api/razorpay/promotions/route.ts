// Magic Checkout's "get promotions" URL: the coupons listed in Razorpay's
// window for the shopper to pick. None are listed, so codes stay private;
// shoppers type a code and /api/razorpay/apply-promotion checks it.
const noPromotions = () => Response.json({ promotions: [] });

export const GET = noPromotions;
export const POST = noPromotions;
