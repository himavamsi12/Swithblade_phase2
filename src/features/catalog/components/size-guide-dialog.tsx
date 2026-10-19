"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  averageProportions,
  type BodyPart,
  cmToIn,
  HEIGHT_RANGE,
  modelMeasurements,
  PROPORTION_MAX,
  PROPORTION_MIN,
  proportionLabel,
  type Proportions,
  recommendSize,
  sizeChart,
  WEIGHT_RANGE,
} from "../size-guide";
import type { ProductSize } from "../types";

type SizeGuideDialogProps = {
  /** Photo of the model shown beside the guide. */
  modelImage: string | null;
  productName: string;
  sizes: ProductSize[];
  /** Called when the shopper picks the recommended size. */
  onSelectSize: (size: string) => void;
};

type Tab = "find" | "chart" | "measure";
const tabs: { id: Tab; label: string }[] = [
  { id: "find", label: "Find my size" },
  { id: "chart", label: "Size chart" },
  { id: "measure", label: "How to measure" },
];

const bodyParts: BodyPart[] = ["shoulders", "chest", "waist", "hips"];

const genders = ["Male", "Female", "Other"] as const;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const eyebrow =
  "text-body-4 tracking-[0.12em] text-muted uppercase md:text-body-3";
const input =
  "h-[46px] w-full border border-stroke bg-white px-4 text-body-1 text-black placeholder:text-dark-grey/50 focus:border-black focus:outline-none md:h-14 md:px-5 md:text-[18px]";
const choice = (selected: boolean) =>
  cn(
    "border text-body-3 tracking-[0.12em] uppercase transition-colors md:text-body-2",
    selected
      ? "border-black bg-black text-white"
      : "border-stroke text-muted hover:border-dark-grey hover:text-black",
    focusRing,
  );
const primaryButton =
  "h-[43px] min-w-[122px] bg-primary px-6 text-body-3 tracking-[0.12em] text-white uppercase transition-opacity hover:opacity-90 disabled:bg-stroke disabled:text-muted disabled:hover:opacity-100 md:h-12 md:min-w-40 md:text-body-2";
const outlineButton =
  "h-[43px] min-w-[104px] border border-stroke bg-white px-6 text-body-3 tracking-[0.12em] text-black uppercase transition-colors hover:border-black md:h-12 md:min-w-32 md:text-body-2";

const inRange = (value: string, { min, max }: { min: number; max: number }) => {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n >= min && n <= max;
};

/**
 * Size guide pop-up: a three-step size finder, the size chart and measuring
 * tips. Uses the native <dialog>, so focus trapping, Escape to close and an
 * inert page behind it come from the browser.
 */
export function SizeGuideDialog({
  modelImage,
  productName,
  sizes,
  onSelectSize,
}: SizeGuideDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [tab, setTab] = useState<Tab>("find");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  // Age and gender are collected as designed but not used by the size logic yet.
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<(typeof genders)[number] | null>(null);
  const [proportions, setProportions] =
    useState<Proportions>(averageProportions);
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  const bodyValid =
    inRange(height, HEIGHT_RANGE) && inRange(weight, WEIGHT_RANGE);
  const recommendation =
    step === 3
      ? recommendSize({
          height: Number(height),
          weight: Number(weight),
          proportions,
        })
      : null;
  const recommendedAvailable =
    recommendation &&
    sizes.find((s) => s.label === recommendation.size)?.available !== false;

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();
  const restart = () => {
    setStep(1);
    setProportions(averageProportions);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.id === tab);
    const next =
      tabs[
        (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
      ]!;
    setTab(next.id);
    document.getElementById(`${id}-tab-${next.id}`)?.focus();
  };

  const format = (cm: number) => (unit === "cm" ? cm : cmToIn(cm));
  const range = ([a, b]: [number, number]) => `${format(a)}–${format(b)}`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={cn(
          "text-body-4 font-semibold uppercase underline",
          focusRing,
        )}
      >
        Size guide
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto h-dvh max-h-none w-full max-w-none bg-white p-0 text-black backdrop:bg-black/40 open:flex md:h-[min(860px,calc(100dvh-48px))] md:w-[min(1240px,calc(100vw-48px))]"
      >
        <h2 id={`${id}-title`} className="sr-only">
          Size guide for {productName}
        </h2>

        {/* Model photo and measurements */}
        <aside className="hidden w-[36%] shrink-0 flex-col bg-card md:flex">
          <div className="relative flex-1">
            {modelImage && (
              <Image
                src={modelImage}
                alt={`Model wearing size ${modelMeasurements.size}`}
                fill
                sizes="440px"
                className="object-contain"
              />
            )}
          </div>
          <div className="flex flex-col gap-3 border-t border-stroke px-5 py-5 md:px-7 md:py-7">
            <p className={eyebrow}>Model · Size {modelMeasurements.size}</p>
            <ul className="flex flex-wrap gap-1 md:gap-1.5">
              {[
                ["H", modelMeasurements.height],
                ["C", modelMeasurements.chest],
                ["W", modelMeasurements.waist],
                ["Hip", modelMeasurements.hip],
              ].map(([label, value]) => (
                <li
                  key={label}
                  className="flex h-[25px] items-center gap-1 border border-stroke px-1.5 text-body-4 md:h-8 md:px-2.5 md:text-body-3"
                >
                  <span className="tracking-[0.1em] text-muted uppercase">
                    {label}
                  </span>
                  <span>{value}cm</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-stroke pr-4 pl-4 md:pr-14 md:pl-14">
            <div
              role="tablist"
              aria-label="Size guide"
              className="flex gap-4 overflow-x-auto md:gap-10"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  id={`${id}-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`${id}-panel-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={onTabKeyDown}
                  className={cn(
                    "-mb-px h-[58px] shrink-0 border-b-2 text-body-4 tracking-[0.06em] whitespace-nowrap uppercase md:h-[68px] md:text-body-2 md:tracking-[0.14em]",
                    tab === t.id
                      ? "border-black font-semibold text-black md:font-semibold"
                      : "border-transparent text-muted hover:text-black",
                    focusRing,
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close size guide"
              className={cn(
                "ml-4 shrink-0 text-muted hover:text-black",
                focusRing,
              )}
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          {/* Find my size */}
          {tab === "find" && (
            <div
              id={`${id}-panel-find`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-find`}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-5 pt-8 pb-6 md:px-14 md:pt-[34px]">
                <p className={eyebrow}>
                  Step <span className="font-semibold text-black">{step}</span>{" "}
                  / 3
                </p>

                {step === 1 && (
                  <>
                    <h3 className="mt-7 text-h4 font-normal md:mt-12 md:text-[32px]">
                      Tell us your height &amp; weight.
                    </h3>
                    <div className="mt-6 grid gap-6 md:mt-10 md:grid-cols-2 md:gap-x-4 md:gap-y-8">
                      <label className="flex flex-col gap-3">
                        <span className={eyebrow}>Height (cm)</span>
                        <input
                          className={input}
                          inputMode="numeric"
                          type="number"
                          min={HEIGHT_RANGE.min}
                          max={HEIGHT_RANGE.max}
                          placeholder="e.g. 163"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-3">
                        <span className={eyebrow}>Weight (kg)</span>
                        <input
                          className={input}
                          inputMode="numeric"
                          type="number"
                          min={WEIGHT_RANGE.min}
                          max={WEIGHT_RANGE.max}
                          placeholder="e.g. 65"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-3 md:col-span-2">
                        <span className={eyebrow}>Age</span>
                        <input
                          className={input}
                          inputMode="numeric"
                          type="number"
                          min={1}
                          max={120}
                          placeholder="e.g. 26"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                        />
                      </label>
                      <fieldset className="flex flex-col gap-3 md:col-span-2">
                        <legend className={cn(eyebrow, "mb-3")}>Gender</legend>
                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                          {genders.map((g) => (
                            <button
                              key={g}
                              type="button"
                              aria-pressed={gender === g}
                              onClick={() => setGender(g)}
                              className={cn(
                                "h-10 md:h-14",
                                choice(gender === g),
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className={cn(eyebrow, "mt-7 md:mt-10")}>
                      Your proportions
                    </p>
                    <h3 className="mt-2 text-h4 font-normal md:text-[32px]">
                      How do you carry your frame?
                    </h3>
                    <p className="mt-2 text-body-2 text-muted md:text-body-1">
                      Compare yourself to others of similar height and weight.
                    </p>
                    <div className="mt-8 flex flex-col gap-7 md:mt-10 md:gap-9">
                      {bodyParts.map((part) => (
                        <ProportionSlider
                          key={part}
                          part={part}
                          value={proportions[part]}
                          onChange={(value) =>
                            setProportions((p) => ({ ...p, [part]: value }))
                          }
                        />
                      ))}
                    </div>
                  </>
                )}

                {step === 3 && recommendation && (
                  <div aria-live="polite">
                    <p className={cn(eyebrow, "mt-7 md:mt-10")}>Your result</p>
                    <h3 className="mt-2 text-h4 font-normal md:text-[32px]">
                      Your recommended size.
                    </h3>
                    <p
                      className="mt-6 flex size-20 items-center justify-center border-2 border-black text-[32px] font-semibold md:mt-8 md:size-28 md:text-[44px]"
                      aria-label={`Size ${recommendation.size}`}
                    >
                      {recommendation.size}
                    </p>
                    <p className="mt-6 text-body-2 text-muted md:mt-8 md:text-body-1">
                      {recommendedAvailable
                        ? "There is a good chance that this size will fit you perfectly"
                        : `Size ${recommendation.size} is sold out in this style right now.`}
                    </p>
                    <div className="mt-6 bg-card px-4 py-4 md:mt-8 md:px-6 md:py-5">
                      <p className="text-body-4 tracking-[0.12em] text-black uppercase md:text-body-3">
                        Note
                      </p>
                      <p className="mt-2 text-body-3 text-muted md:text-body-2">
                        Sizing may differ across fits and fabrics.
                        <br />
                        Refer to the size chart tab for exact garment
                        dimensions.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "flex items-center gap-4 border-t border-stroke px-5 py-5 md:px-14",
                  step > 1 && "justify-between",
                )}
              >
                {step === 1 && (
                  <button
                    type="button"
                    disabled={!bodyValid}
                    onClick={() => setStep(2)}
                    className={cn(primaryButton, focusRing)}
                  >
                    Continue
                  </button>
                )}
                {step === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={cn(outlineButton, focusRing)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className={cn(primaryButton, focusRing)}
                    >
                      Calculate
                    </button>
                  </>
                )}
                {step === 3 && recommendation && (
                  <>
                    <button
                      type="button"
                      onClick={restart}
                      className={cn(outlineButton, focusRing)}
                    >
                      Start over
                    </button>
                    <button
                      type="button"
                      disabled={!recommendedAvailable}
                      onClick={() => {
                        onSelectSize(recommendation.size);
                        close();
                      }}
                      className={cn(primaryButton, focusRing)}
                    >
                      Shop {recommendation.size}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Size chart */}
          {tab === "chart" && (
            <div
              id={`${id}-panel-chart`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-chart`}
              className="flex-1 overflow-y-auto px-5 pt-8 pb-8 md:px-14"
            >
              <div className="flex items-center justify-between gap-4">
                <p className={eyebrow}>Body measurements</p>
                <div role="group" aria-label="Units" className="flex">
                  {(["cm", "in"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => setUnit(u)}
                      className={cn("h-8 w-12", choice(unit === u))}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-left text-body-2 md:text-body-1">
                  <thead>
                    <tr className="border-b border-black">
                      {["Size", "Chest", "Waist", "Hip", "Length"].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className={cn(eyebrow, "py-3 pr-4 font-normal")}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChart.map((row) => (
                      <tr key={row.size} className="border-b border-stroke">
                        <th
                          scope="row"
                          className="py-3 pr-4 font-semibold md:py-4"
                        >
                          {row.size}
                        </th>
                        <td className="py-3 pr-4">{range(row.chest)}</td>
                        <td className="py-3 pr-4">{range(row.waist)}</td>
                        <td className="py-3 pr-4">{range(row.hip)}</td>
                        <td className="py-3 pr-4">{format(row.length)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-body-3 text-muted">
                Measurements in {unit === "cm" ? "centimetres" : "inches"}.
                Length is measured from the back of the neck to the hem.
              </p>
            </div>
          )}

          {/* How to measure */}
          {tab === "measure" && (
            <div
              id={`${id}-panel-measure`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-measure`}
              className="flex-1 overflow-y-auto px-5 pt-8 pb-8 md:px-14"
            >
              <h3 className="text-h4 font-normal md:text-[32px]">
                Measure over light clothing.
              </h3>
              <p className="mt-2 text-body-2 text-muted">
                Keep the tape snug but not tight, and stand relaxed.
              </p>
              <ol className="mt-8 flex flex-col">
                {[
                  [
                    "Chest",
                    "Around the fullest part of your chest, under the arms and across the shoulder blades.",
                  ],
                  [
                    "Waist",
                    "Around your natural waistline, the narrowest part of your torso.",
                  ],
                  [
                    "Hip",
                    "Around the fullest part of your hips, with feet together.",
                  ],
                  [
                    "Height",
                    "Stand straight against a wall without shoes, from the floor to the top of your head.",
                  ],
                ].map(([title, text], i) => (
                  <li
                    key={title}
                    className="flex gap-5 border-t border-stroke py-5 last:border-b"
                  >
                    <span className="text-body-3 tracking-[0.12em] text-muted">
                      0{i + 1}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-body-2 tracking-[0.1em] uppercase">
                        {title}
                      </span>
                      <span className="text-body-2 text-muted">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

type ProportionSliderProps = {
  part: BodyPart;
  value: number;
  onChange: (value: number) => void;
};

const STOPS = PROPORTION_MAX - PROPORTION_MIN;

/**
 * Five-step slider (narrower … broader) with − / + buttons. A native range
 * input underneath keeps keyboard and screen-reader support; the track, stops
 * and thumb are drawn on top.
 */
function ProportionSlider({ part, value, onChange }: ProportionSliderProps) {
  const id = useId();
  const label = proportionLabel(part, value);
  const percent = ((value - PROPORTION_MIN) / STOPS) * 100;
  const step = (delta: number) =>
    onChange(Math.min(PROPORTION_MAX, Math.max(PROPORTION_MIN, value + delta)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-body-4 tracking-[0.12em] text-black uppercase md:text-body-3"
        >
          {part}
        </label>
        <span
          aria-hidden
          className="text-body-4 tracking-[0.12em] text-muted uppercase md:text-body-3"
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value === PROPORTION_MIN}
          aria-label={`Narrower ${part}`}
          className={cn(
            "text-[20px] leading-none disabled:text-stroke",
            focusRing,
          )}
        >
          −
        </button>
        <div className="relative h-5 flex-1">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-stroke"
          />
          <span
            aria-hidden
            className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-primary"
            style={{ width: `${percent}%` }}
          />
          {Array.from({ length: STOPS + 1 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                i / STOPS <= percent / 100 ? "bg-primary" : "bg-dark-grey/40",
              )}
              style={{ left: `${(i / STOPS) * 100}%` }}
            />
          ))}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-[left] duration-150"
            style={{ left: `${percent}%` }}
          />
          <input
            id={id}
            type="range"
            min={PROPORTION_MIN}
            max={PROPORTION_MAX}
            step={1}
            value={value}
            aria-valuetext={label}
            onChange={(e) => onChange(Number(e.target.value))}
            className="peer absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 hidden size-6 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-primary/40 peer-focus-visible:block"
            style={{ left: `${percent}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value === PROPORTION_MAX}
          aria-label={`Broader ${part}`}
          className={cn(
            "text-[20px] leading-none disabled:text-stroke",
            focusRing,
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}
