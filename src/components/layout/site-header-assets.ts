import accountBlack from "@/assets/icons/nav/black/account.svg";
import bagBlack from "@/assets/icons/nav/black/bag.svg";
import logoMarkBlack from "@/assets/icons/nav/black/logo-mark.svg";
import logoTmBlack from "@/assets/icons/nav/black/logo-tm.svg";
import searchBlack from "@/assets/icons/nav/black/search.svg";
import wishlistBlack from "@/assets/icons/nav/black/wishlist.svg";
import wordmarkBlack from "@/assets/icons/nav/black/wordmark.svg";
import accountWhite from "@/assets/icons/nav/white/account.svg";
import bagWhite from "@/assets/icons/nav/white/bag.svg";
import logoMarkWhite from "@/assets/icons/nav/white/logo-mark.svg";
import logoTmWhite from "@/assets/icons/nav/white/logo-tm.svg";
import searchWhite from "@/assets/icons/nav/white/search.svg";
import wishlistWhite from "@/assets/icons/nav/white/wishlist.svg";
import wordmarkWhite from "@/assets/icons/nav/white/wordmark.svg";

/** Colour of the header content: white for dark backgrounds, black for light ones. */
export type HeaderTone = "white" | "black";

export const headerAssets = {
  white: {
    search: searchWhite,
    wishlist: wishlistWhite,
    bag: bagWhite,
    account: accountWhite,
    logoMark: logoMarkWhite,
    logoTm: logoTmWhite,
    wordmark: wordmarkWhite,
  },
  black: {
    search: searchBlack,
    wishlist: wishlistBlack,
    bag: bagBlack,
    account: accountBlack,
    logoMark: logoMarkBlack,
    logoTm: logoTmBlack,
    wordmark: wordmarkBlack,
  },
} as const;
