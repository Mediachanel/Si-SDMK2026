"use client";

export default function MultiStepForm({ header, body, footer }) {
  return (
    <div className="space-y-6 pb-44 md:pb-32">
      {header}
      {body}
      {footer}
    </div>
  );
}
