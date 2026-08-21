/**
 * Review prompts shown on the public walk-in guest forms.
 *
 * Keyed by public guest form slug. A business unit with no entry — and no spa
 * flag to fall back on — simply shows no review bubble.
 */
export type GuestReviewLink = {
  /** Branded QR artwork in /public. Encodes the same destination as reviewUrl. */
  qrImage: string;
  /**
   * Tap-through destination for guests already on their phone, who cannot scan
   * a QR on the screen they are holding. Omit and the bubble shows the QR only.
   */
  reviewUrl?: string;
};

const GUEST_REVIEW_LINKS_BY_SLUG: Record<string, GuestReviewLink> = {
  "casalavoro-residence": {
    qrImage: "/wuse-residence-review.svg",
    // Google's "write a review" deep link for the residence listing. The #lrd
    // fragment's trailing ,3 is what opens the review box rather than the
    // listing itself.
    reviewUrl:
      "https://www.google.com/search?q=casalavoro+residence+wuse+2+abuja#lrd=0x104e0b6bf8d0f2e3:0x636ba3ccb3e9a498,3",
  },
};

/** Used by any spa-flagged business unit that has no slug-specific entry. */
const SPA_REVIEW_LINK: GuestReviewLink = {
  qrImage: "/wuse-spa-review.svg",
  reviewUrl: "https://g.page/r/CRczrLCr0uXhECE/review",
};

export function resolveGuestReviewLink(options: {
  slug: string;
  isSpaForm: boolean;
}): GuestReviewLink | null {
  return GUEST_REVIEW_LINKS_BY_SLUG[options.slug] ?? (options.isSpaForm ? SPA_REVIEW_LINK : null);
}
