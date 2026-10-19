/** One line in the bag: a product in a specific colour and size. */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  /** Unit price, integer minor units (cents). */
  price: number;
  currency: string;
  color: string | null;
  size: string | null;
  quantity: number;
};

export type CartItemInput = Omit<CartLine, "quantity">;
