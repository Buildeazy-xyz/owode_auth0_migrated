import { forwardRef } from "react";
import { cn } from "@/lib/utils.ts";
import { Input } from "@/components/ui/input.tsx";

/**
 * Phone input with a fixed +234 (Nigeria) country code prefix.
 * The `value` and `onChange` work with the FULL international number (e.g. "+2348012345678").
 * Internally it strips the prefix for display and re-adds it on change.
 */

const PREFIX = "+234";

function stripPrefix(val: string): string {
  if (val.startsWith(PREFIX)) return val.slice(PREFIX.length);
  // Also handle "234" without the + sign
  if (val.startsWith("234") && val.length > 3) return val.slice(3);
  // Strip leading "0" (common Nigerian format 080...)
  if (val.startsWith("0")) return val.slice(1);
  return val;
}

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const localPart = stripPrefix(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const raw = e.target.value.replace(/\D/g, "");
      // Strip leading 0 if user pastes a local number
      const cleaned = raw.startsWith("0") ? raw.slice(1) : raw;
      onChange(`${PREFIX}${cleaned}`);
    };

    return (
      <div className={cn("flex", className)}>
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground font-medium select-none">
          {PREFIX}
        </span>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={localPart}
          onChange={handleChange}
          className="rounded-l-none"
          placeholder="8012345678"
          maxLength={11}
          {...props}
        />
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
