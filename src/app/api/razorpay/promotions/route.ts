// Magic Checkout requires a promotions URL. There are no coupons yet, so the
// list is always empty.
const noPromotions = () => Response.json({ promotions: [] });

export const GET = noPromotions;
export const POST = noPromotions;
