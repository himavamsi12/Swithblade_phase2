"use client";

import { Check, ChevronDown, Upload, X } from "lucide-react";
import Image from "next/image";
import {
  forwardRef,
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requestReturn } from "../actions";
import type { OrderView } from "../customer";
import { resizePhoto } from "../resize-photo";
import {
  idle,
  MAX_RETURN_PHOTOS,
  MIN_RETURN_PHOTOS,
  PHOTO_CAPTION_MAX,
} from "../schema";
import {
  AccountModal,
  fillButton,
  ModalFooter,
  outlineButton,
} from "./account-modal";
import { focusRing } from "./styles";

export type ReturnReasonOption = {
  id: number;
  label: string;
  /** "Other": the shopper must describe the reason in the details box. */
  needsDetails: boolean;
};

const NOTE_MAX = 500;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "SB-1010 · Delivered 4 Nov 2026". */
export function orderSubtitle(order: OrderView) {
  const delivered = order.tracking.deliveredAt;
  return delivered
    ? `${order.number} · Delivered ${shortDate(delivered)}`
    : order.number;
}

/**
 * Return order: pick the products, give a reason and photos, review, submit.
 * The request waits for staff review; approving it books the courier.
 */
export const ReturnOrderDialog = forwardRef<
  HTMLDialogElement,
  {
    order: OrderView;
    reasons: ReturnReasonOption[];
    open: boolean;
    onClose: () => void;
  }
>(function ReturnOrderDialog({ order, reasons, open, onClose }, ref) {
  return (
    <AccountModal
      ref={ref}
      id={`return-${order.id}`}
      title="Return order"
      subtitle={orderSubtitle(order)}
      open={open}
      onClose={onClose}
    >
      <ReturnSteps order={order} reasons={reasons} />
    </AccountModal>
  );
});

type Photo = { file: File; url: string; caption: string };
type Step = 0 | 1 | 2;

function ReturnSteps({
  order,
  reasons,
}: {
  order: OrderView;
  reasons: ReturnReasonOption[];
}) {
  const [state, action, pending] = useActionState(requestReturn, idle);
  const [step, setStep] = useState<Step>(0);
  // Line id → how many to return; missing means not returned.
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [reasonId, setReasonId] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<{
    reason?: string;
    note?: string;
    photos?: string;
  }>({});
  const top = useRef<HTMLDivElement>(null);

  const chosen = order.items.filter((i) => (picked[i.key] ?? 0) > 0);
  const count = chosen.reduce((sum, i) => sum + picked[i.key]!, 0);
  const reason = reasons.find((r) => String(r.id) === reasonId);

  // Free the photo previews when the dialog closes.
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  useEffect(
    () => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)),
    [],
  );

  // A server error on items sends the shopper back to fix them.
  const serverPhotoError =
    state.status === "error" && state.fieldErrors?.photos;

  const go = (next: Step) => {
    setStep(next);
    top.current?.scrollIntoView({ block: "nearest" });
  };

  const toDetails = () => go(1);
  const toReview = () => {
    const next = {
      reason:
        reasons.length > 0 && !reason ? "Please choose a reason." : undefined,
      note:
        reason?.needsDetails && !note.trim()
          ? "Please tell us the reason for your return."
          : undefined,
      photos:
        photos.length < MIN_RETURN_PHOTOS
          ? `Please add at least ${MIN_RETURN_PHOTOS} pictures (front and back).`
          : photos.some((p) => !p.caption.trim())
            ? "Please add a caption to each picture."
            : undefined,
    };
    setErrors(next);
    if (!next.reason && !next.note && !next.photos) go(2);
  };
  const submit = () => {
    const form = new FormData();
    form.set("orderId", String(order.id));
    if (reason) form.set("reasonId", String(reason.id));
    form.set("note", note);
    for (const item of chosen)
      form.set(`qty:${item.key}`, String(picked[item.key]));
    for (const photo of photos) {
      form.append("photos", photo.file);
      form.append("captions", photo.caption.trim());
    }
    startTransition(() => action(form));
  };

  if (state.status === "success") {
    return (
      <section className="flex flex-col items-center gap-4 px-8 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary text-white">
          <Check size={20} strokeWidth={2.5} aria-hidden />
        </span>
        <h3 className="text-body-1 font-bold uppercase">Return requested</h3>
        <p className="max-w-[340px] text-body-3 text-dark-grey">
          We received your request for {count} {count === 1 ? "item" : "items"}{" "}
          from {order.number}. We will review the photos and respond within 2–3
          business days.
        </p>
        <button
          type="button"
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className={cn(
            "mt-2 h-11 bg-black px-7 text-body-4 font-semibold tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-85",
            focusRing,
          )}
        >
          Back to orders
        </button>
      </section>
    );
  }

  return (
    <>
      <div ref={top} />
      <Stepper step={step} />

      {step === 0 && (
        <section className="px-6 py-6 sm:px-7">
          <h3 className="text-body-1 font-bold uppercase">
            Which product are you returning?
          </h3>
          <p className="mt-1 text-body-3 text-dark-grey">
            Select one or more products from this order.
          </p>
          <p className="mt-5 text-body-4 tracking-[0.04em] text-muted uppercase">
            Select items to return <span className="text-red-600">*</span>
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {order.items.map((item) => (
              <ProductChoice
                key={item.key}
                item={item}
                currency={order.currency}
                quantity={picked[item.key] ?? 0}
                onChange={(n) =>
                  setPicked((p) => {
                    const next = { ...p };
                    if (n > 0) next[item.key] = n;
                    else delete next[item.key];
                    return next;
                  })
                }
              />
            ))}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-6 px-6 py-6 sm:px-7">
          <div>
            <h3 className="text-body-1 font-bold uppercase">
              Tell us about the return
            </h3>
            <p className="mt-1 text-body-3 text-dark-grey">
              Add a reason and clear pictures to help us review your request.
            </p>
          </div>

          {reasons.length > 0 && (
            <Field
              label="Reason for return"
              required
              error={errors.reason}
              htmlFor={`reason-${order.id}`}
            >
              <div className="relative">
                <select
                  id={`reason-${order.id}`}
                  value={reasonId}
                  aria-invalid={Boolean(errors.reason)}
                  onChange={(e) => {
                    setReasonId(e.target.value);
                    setErrors((x) => ({
                      ...x,
                      reason: undefined,
                      note: undefined,
                    }));
                  }}
                  className={cn(
                    "h-11 w-full appearance-none border border-stroke bg-white pr-10 pl-3 text-body-3 aria-invalid:border-red-600 max-md:text-[16px]",
                    !reasonId && "text-muted",
                    focusRing,
                  )}
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  {reasons.map((r) => (
                    <option key={r.id} value={r.id} className="text-black">
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                />
              </div>
            </Field>
          )}

          <Field
            label="Additional details"
            required={reason?.needsDetails}
            error={errors.note}
            htmlFor={`note-${order.id}`}
          >
            <textarea
              id={`note-${order.id}`}
              value={note}
              maxLength={NOTE_MAX}
              rows={3}
              aria-invalid={Boolean(errors.note)}
              onChange={(e) => {
                setNote(e.target.value);
                if (e.target.value.trim()) {
                  setErrors((x) => ({ ...x, note: undefined }));
                }
              }}
              placeholder={
                reason?.needsDetails
                  ? "Please describe the reason for your return..."
                  : "Tell us what went wrong..."
              }
              className={cn(
                "w-full resize-none border border-stroke px-3 py-2.5 text-body-3 placeholder:text-muted aria-invalid:border-red-600 max-md:text-[16px]",
                focusRing,
              )}
            />
            <p className="mt-1 text-right text-body-4 text-muted">
              {note.length}/{NOTE_MAX}
            </p>
          </Field>

          <PhotoPicker
            photos={photos}
            error={errors.photos}
            onChange={(next) => {
              setPhotos(next);
              if (
                next.length >= MIN_RETURN_PHOTOS &&
                next.every((p) => p.caption.trim())
              ) {
                setErrors((x) => ({ ...x, photos: undefined }));
              }
            }}
          />
        </section>
      )}

      {step === 2 && (
        <section className="px-6 py-6 sm:px-7">
          <h3 className="text-body-1 font-bold uppercase">
            Review your return
          </h3>
          <p className="mt-1 text-body-3 text-dark-grey">
            Check the information below before submitting.
          </p>

          <ReviewHeading label="Products" onEdit={() => go(0)} />
          <ul className="flex flex-col gap-px bg-stroke">
            {chosen.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-4 bg-card px-4 py-3"
              >
                <Thumb src={item.image} />
                <div className="min-w-0">
                  <p className="text-body-3 font-semibold uppercase">
                    {item.title}
                  </p>
                  <p className="text-body-4 text-muted">
                    {[
                      item.options,
                      item.unitPrice != null && order.currency
                        ? formatPrice(item.unitPrice, order.currency)
                        : null,
                      picked[item.key]! > 1 ? `Qty ${picked[item.key]}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-stroke" />
          <ReviewHeading label="Return details" onEdit={() => go(1)} />
          <dl className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 text-body-3">
            {reason && (
              <>
                <dt className="text-body-4 text-muted uppercase">Reason</dt>
                <dd>{reason.label}</dd>
              </>
            )}
            {note.trim() && (
              <>
                <dt className="text-body-4 text-muted uppercase">Details</dt>
                <dd className="break-words whitespace-pre-line">
                  {note.trim()}
                </dd>
              </>
            )}
            <dt className="text-body-4 text-muted uppercase">Pictures</dt>
            <dd className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <figure key={p.url} className="flex w-16 flex-col gap-1">
                  <PhotoPreview url={p.url} size="lg" />
                  <figcaption className="text-[10px] leading-tight break-words text-muted">
                    {p.caption}
                  </figcaption>
                </figure>
              ))}
            </dd>
          </dl>

          <p className="mt-6 bg-card px-4 py-3 text-body-4 text-dark-grey">
            By submitting, you confirm that the selected products are unworn,
            unwashed, and have their original tags attached.
          </p>
          {state.status === "error" && (
            <p role="alert" className="mt-4 text-body-3 text-red-600">
              {serverPhotoError ||
                state.message ||
                state.fieldErrors?.lines ||
                "Please check your return and try again."}
            </p>
          )}
        </section>
      )}

      <ModalFooter>
        {step === 0 ? (
          <button
            type="button"
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
            className={outlineButton}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => go((step - 1) as Step)}
            className={outlineButton}
          >
            Back
          </button>
        )}
        {step === 0 && (
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={toDetails}
            className={fillButton}
          >
            Continue to return details
          </button>
        )}
        {step === 1 && (
          <button type="button" onClick={toReview} className={fillButton}>
            Review return
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className={fillButton}
          >
            {pending ? "Submitting…" : "Submit return request"}
          </button>
        )}
      </ModalFooter>
    </>
  );
}

const STEPS = ["Select products", "Return details", "Review"];

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2 border-b border-stroke px-6 py-4 sm:px-7">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              i < STEPS.length - 1 && "flex-1",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-body-4 font-semibold",
                done || current
                  ? "bg-primary text-white"
                  : "bg-card text-muted",
              )}
            >
              {done ? <Check size={13} strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[10px] tracking-[0.04em] whitespace-nowrap uppercase",
                current ? "font-semibold text-black" : "text-muted",
                // Phones only have room for the current step's name.
                !current && "max-sm:sr-only",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn("h-px flex-1", done ? "bg-primary" : "bg-stroke")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ProductChoice({
  item,
  currency,
  quantity,
  onChange,
}: {
  item: OrderView["items"][number];
  currency: string | null;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const id = useId();
  const max = item.returnableQuantity;
  const selected = quantity > 0;
  const unavailable = max === 0;
  return (
    <li
      className={cn(
        "relative flex items-center gap-4 border px-3 py-3 transition-colors",
        selected ? "border-primary bg-[#f3f5fd]" : "border-stroke",
        unavailable && "opacity-50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={selected}
        disabled={unavailable}
        onChange={(e) => onChange(e.target.checked ? max : 0)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-4",
          !unavailable && "cursor-pointer",
        )}
      >
        <Thumb src={item.image} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-body-3 font-semibold uppercase">
            {item.title}
          </span>
          <span className="text-body-4 text-muted">
            {[
              item.options,
              item.unitPrice != null && currency
                ? formatPrice(item.unitPrice, currency)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="text-[10px] tracking-[0.04em] text-muted uppercase">
            {unavailable
              ? "Already returned"
              : selected
                ? "Selected"
                : "Select item"}
          </span>
        </span>
      </label>
      {selected && max > 1 && (
        <select
          aria-label={`How many ${item.title} to return`}
          value={quantity}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "h-9 border border-stroke bg-white px-2 text-body-3 max-md:text-[16px]",
            focusRing,
          )}
        >
          {Array.from({ length: max }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Qty {i + 1}
            </option>
          ))}
        </select>
      )}
      {/* The visible box; the real checkbox above keeps keyboard and screen readers. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none flex size-[18px] shrink-0 items-center justify-center self-start border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          selected
            ? "border-primary bg-primary text-white"
            : "border-dark-grey/40 bg-white",
        )}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </li>
  );
}

/** Suggested captions for the first pictures: front, then back. */
const CAPTION_HINTS = ["Front", "Back"];

function PhotoPicker({
  photos,
  error,
  onChange,
}: {
  photos: Photo[];
  error?: string;
  onChange: (photos: Photo[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const room = MAX_RETURN_PHOTOS - photos.length;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setReadError(null);
    const added: Photo[] = [];
    for (const file of [...files].slice(0, room)) {
      try {
        const small = await resizePhoto(file);
        added.push({
          file: small,
          url: URL.createObjectURL(small),
          caption: "",
        });
      } catch {
        setReadError(`Couldn't read ${file.name}. Try a JPG, PNG or WEBP.`);
      }
    }
    if (files.length > room) {
      setReadError(`You can add up to ${MAX_RETURN_PHOTOS} pictures.`);
    }
    onChange([...photos, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const message = error ?? readError;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-body-4 font-semibold tracking-[0.04em] uppercase">
          Upload pictures <span className="text-red-600">*</span>
        </p>
        <p className="shrink-0 text-body-4 text-muted">
          Up to {MAX_RETURN_PHOTOS} images
        </p>
      </div>
      <p className="mt-1 text-body-4 text-dark-grey">
        Upload at least {MIN_RETURN_PHOTOS} photos (front and back) with
        captions. You can upload up to {MAX_RETURN_PHOTOS} images.
      </p>

      {photos.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {photos.map((p, i) => (
            <li
              key={p.url}
              className="flex items-center gap-3 border border-stroke p-2"
            >
              <PhotoPreview url={p.url} size="lg" />
              <label className="min-w-0 flex-1">
                <span className="sr-only">Caption for picture {i + 1}</span>
                <input
                  type="text"
                  value={p.caption}
                  maxLength={PHOTO_CAPTION_MAX}
                  aria-invalid={Boolean(error) && !p.caption.trim()}
                  placeholder={`Caption, e.g. ${CAPTION_HINTS[i] ?? "Damage close-up"}`}
                  onChange={(e) =>
                    onChange(
                      photos.map((x) =>
                        x === p ? { ...x, caption: e.target.value } : x,
                      ),
                    )
                  }
                  className={cn(
                    "h-10 w-full border border-stroke px-3 text-body-3 placeholder:text-muted aria-invalid:border-red-600 max-md:text-[16px]",
                    focusRing,
                  )}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(p.url);
                  onChange(photos.filter((x) => x !== p));
                }}
                aria-label={`Remove picture ${i + 1}`}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center text-dark-grey transition-colors hover:text-black",
                  focusRing,
                )}
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {room > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className={cn(
            "mt-3 flex w-full flex-col items-center gap-2 border border-dashed py-8 transition-colors hover:border-black",
            error && photos.length < MIN_RETURN_PHOTOS
              ? "border-red-600"
              : "border-dark-grey/40",
            focusRing,
          )}
        >
          <Upload size={20} strokeWidth={1.5} aria-hidden />
          <span className="text-body-4 font-semibold tracking-[0.04em] uppercase">
            {busy
              ? "Adding…"
              : photos.length > 0
                ? "Add more photos"
                : "Choose photos"}
          </span>
          <span className="text-[10px] text-muted">JPG, PNG or WEBP</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => void add(e.target.files)}
      />
      {message && (
        <p role="alert" className="mt-2 text-body-4 text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-body-4 font-semibold tracking-[0.04em] uppercase"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-2 text-body-4 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewHeading({
  label,
  onEdit,
}: {
  label: string;
  onEdit: () => void;
}) {
  return (
    <div className="mt-5 mb-3 flex items-center justify-between">
      <h4 className="text-body-4 tracking-[0.04em] text-muted uppercase">
        {label}
      </h4>
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "text-body-4 font-semibold text-primary uppercase underline underline-offset-2",
          focusRing,
        )}
      >
        Edit
      </button>
    </div>
  );
}

export function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative h-[60px] w-12 shrink-0 overflow-hidden bg-card">
      {src && (
        <Image src={src} alt="" fill sizes="48px" className="object-cover" />
      )}
    </span>
  );
}

function PhotoPreview({
  url,
  size = "sm",
}: {
  url: string;
  size?: "sm" | "lg";
}) {
  return (
    // A local preview (blob: URL), so next/image can't optimise it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={cn(
        "border border-stroke object-cover",
        size === "lg" ? "size-16" : "size-12",
      )}
    />
  );
}
