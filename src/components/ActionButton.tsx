import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { twMerge } from "tailwind-merge";

export function ActionButton(
  props: DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) {
  return (
    <button
      {...props}
      className={twMerge(
        "p-2 border border-black",
        props.className,
        props.disabled
          ? "opacity-50 text-gray-500 border-gray-300 cursor-not-allowed"
          : ""
      )}
    />
  );
}
