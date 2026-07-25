export interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

/** Polaris (this app's version) has no native Switch component — this is a
 * plain checkbox styled as a pill toggle, so it stays keyboard- and
 * screen-reader-accessible like any other checkbox. */
export function ToggleSwitch({
  checked,
  disabled,
  label,
  onChange,
}: ToggleSwitchProps) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
