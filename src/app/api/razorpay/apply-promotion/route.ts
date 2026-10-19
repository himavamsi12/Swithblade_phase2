// Magic Checkout requires an apply-promotion URL. There are no coupons yet,
// so every code is rejected.
const rejectCode = () =>
  Response.json(
    {
      failure_code: "INVALID_PROMOTION",
      failure_reason: "This coupon code isn't valid.",
    },
    { status: 400 },
  );

export const GET = rejectCode;
export const POST = rejectCode;
