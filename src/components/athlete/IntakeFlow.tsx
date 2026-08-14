"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

import { INTAKE_STEPS } from "@/lib/core/skills";

const EMPTY_ANSWERS: Record<string, string> = {};

/*
 * Skill intake — Hinge-style guided prompts (REDESIGN_BRIEF §16.1 Option A):
 * stories, not forms. Completing unlocks the Skill Map.
 * `onBackAtStart` lets a host flow (Onboarding) own Back at the first step.
 */
const IntakeFlow = ({
    onComplete,
    onBackAtStart,
    initialAnswers = EMPTY_ANSWERS,
    startAtEnd = false,
}: {
    onComplete: (answers: Record<string, string>) => void;
    onBackAtStart?: () => void;
    initialAnswers?: Record<string, string>;
    startAtEnd?: boolean;
}) => {
    const [stepIndex, setStepIndex] = useState(() =>
        startAtEnd ? INTAKE_STEPS.length - 1 : 0,
    );
    const [answers, setAnswers] = useState<Record<string, string>>(() => ({
        ...initialAnswers,
    }));

    const step = INTAKE_STEPS[stepIndex];
    const isLast = stepIndex === INTAKE_STEPS.length - 1;
    const currentAnswer = answers[step.id] ?? "";
    const canAdvance = currentAnswer.trim().length > 0;

    const advance = () => {
        if (!canAdvance) return;
        if (isLast) {
            onComplete(answers);
        } else {
            setStepIndex((i) => i + 1);
        }
    };

    return (
        <div className="animate-disclosure">
            {/* Progress */}
            <div
                role="progressbar"
                aria-label="Skill intake progress"
                aria-valuemin={1}
                aria-valuemax={INTAKE_STEPS.length}
                aria-valuenow={stepIndex + 1}
                aria-valuetext={`Question ${stepIndex + 1} of ${INTAKE_STEPS.length}`}
                className="mb-6"
            >
                <span className="sr-only">
                    Question {stepIndex + 1} of {INTAKE_STEPS.length}
                </span>
                <div aria-hidden="true" className="flex items-center gap-2">
                    {INTAKE_STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            className={clsx(
                                "h-1 flex-1 rounded-full transition-colors",
                                i <= stepIndex ? "bg-volt" : "bg-bg-elevated",
                            )}
                        />
                    ))}
                </div>
            </div>

            <h3 className="font-serif text-2xl text-sand italic mb-6">{step.label}</h3>

            {step.kind === "select" ? (
                <div className="space-y-3">
                    {step.options?.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setAnswers((a) => ({ ...a, [step.id]: option }))}
                            aria-pressed={currentAnswer === option}
                            className={clsx(
                                "w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4",
                                currentAnswer === option
                                    ? "bg-volt/10 border-volt text-text-primary"
                                    : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-text-tertiary hover:text-text-primary",
                            )}
                        >
                            <div
                                className={clsx(
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                    currentAnswer === option ? "border-volt" : "border-text-tertiary",
                                )}
                            >
                                {currentAnswer === option && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-volt" />
                                )}
                            </div>
                            <span className="text-[15px]">{option}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <label>
                    <span className="sr-only">{step.label}</span>
                    <textarea
                        value={currentAnswer}
                        onChange={(e) => setAnswers((a) => ({ ...a, [step.id]: e.target.value }))}
                        placeholder={step.placeholder}
                        className="w-full h-36 bg-bg-elevated border border-border-subtle rounded-2xl p-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt resize-none transition-all"
                    />
                </label>
            )}

            <div className="flex items-center justify-between mt-6">
                <button
                    type="button"
                    onClick={() => (stepIndex === 0 ? onBackAtStart?.() : setStepIndex((i) => i - 1))}
                    disabled={stepIndex === 0 && !onBackAtStart}
                    className="-ml-3 flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary disabled:opacity-0 transition-all"
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                    type="button"
                    onClick={advance}
                    disabled={!canAdvance}
                    className="flex min-h-12 items-center gap-2 rounded-full bg-volt px-6 py-3 font-semibold text-volt-ink hover:bg-volt/90 transition-all disabled:opacity-40"
                >
                    {isLast ? "Build my Skill Map" : "Next"} <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default IntakeFlow;
