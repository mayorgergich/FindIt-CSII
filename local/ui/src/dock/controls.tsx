// Thin wrappers over the game's controls. Each falls back to plain markup if the game ever
// moves the component it wraps.
import { Button, Tooltip } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import { CSSProperties, PropsWithChildren, ReactNode, forwardRef } from "react";
import classNames from "classnames";
import { Checkbox, IconButton, RadioToggle, TintedIcon, ToolButton, ToolButtonTheme } from "native";
import styles from "./dock.module.scss";

// White (tinted) icon, like the game's own glyphs.
export const Glyph = (props: { src: string; className?: string; style?: CSSProperties }) =>
  TintedIcon ? (
    <TintedIcon src={props.src} className={props.className} style={props.style} />
  ) : (
    <div className={classNames(styles.glyph, props.className)} style={{ ...props.style, maskImage: `url(${props.src})` }} />
  );

type ToolProps = {
  src?: string;
  tooltip?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  onSelect?: () => void;
};

// The dark square tool-option button (28rem), as in the Line Tool or Tree Controller options.
export const ToolBtn = forwardRef<HTMLDivElement, PropsWithChildren<ToolProps>>((props, ref) => (
  <div ref={ref} className={styles.toolWrap}>
    {ToolButton ? (
      <ToolButton
        src={props.src}
        tooltip={props.tooltip}
        selected={props.selected}
        multiSelect={false}
        disabled={props.disabled}
        focusKey={FOCUS_DISABLED}
        className={classNames(ToolButtonTheme.button, props.className)}
        onSelect={props.disabled ? undefined : props.onSelect}
      >
        {props.children}
      </ToolButton>
    ) : (
      <Tooltip tooltip={props.tooltip}>
        <Button variant="icon" src={props.src} selected={props.selected} focusKey={FOCUS_DISABLED} className={props.className} onSelect={props.onSelect}>
          {props.children}
        </Button>
      </Tooltip>
    )}
  </div>
));

// Generic clickable that plays the game's click sound.
export const Btn = forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string; tooltip?: ReactNode; selected?: boolean; disabled?: boolean; onSelect?: () => void }>>(
  (props, ref) => {
    const button = (
      <Button
        variant="icon"
        className={props.className}
        selected={props.selected}
        disabled={props.disabled}
        focusKey={FOCUS_DISABLED}
        onSelect={props.disabled ? undefined : props.onSelect}
      >
        {props.children}
      </Button>
    );

    return (
      <div ref={ref} className={styles.btnWrap}>
        {props.tooltip ? <Tooltip tooltip={props.tooltip}>{button}</Tooltip> : button}
      </div>
    );
  },
);

// Title-bar style icon button (close, collapse).
export const HeaderIconBtn = (props: { src: string; className?: string; tooltip?: string; onSelect: () => void }) => {
  const button = IconButton ? (
    <IconButton tinted src={props.src} focusKey={FOCUS_DISABLED} className={props.className} onSelect={props.onSelect} />
  ) : (
    <Button variant="icon" src={props.src} focusKey={FOCUS_DISABLED} className={props.className} onSelect={props.onSelect} />
  );

  return props.tooltip ? <Tooltip tooltip={props.tooltip}>{button}</Tooltip> : button;
};

export const CheckRow = (props: { checked: boolean; label: ReactNode; description?: ReactNode; radio?: boolean; icon?: string; onChange: () => void }) => {
  const Toggle = props.radio ? RadioToggle : Checkbox;

  return (
    <div className={styles.checkRow}>
      {Toggle ? (
        <Toggle checked={props.checked} onChange={() => props.onChange()} className={styles.checkToggle} />
      ) : (
        <div className={classNames(styles.checkFallback, props.checked && styles.on)} onClick={props.onChange} />
      )}
      {props.icon && <img src={props.icon} className={styles.checkIcon} onClick={props.onChange} />}
      <div className={styles.checkText} onClick={props.onChange}>
        <div className={styles.checkLabel}>{props.label}</div>
        {props.description && <div className={styles.checkDescription}>{props.description}</div>}
      </div>
    </div>
  );
};
