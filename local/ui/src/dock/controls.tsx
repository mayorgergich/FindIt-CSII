// Small building blocks: game-styled buttons (with the game's click sounds) and masked icons.
import { Button, Tooltip } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import { CSSProperties, PropsWithChildren, ReactNode, forwardRef } from "react";
import classNames from "classnames";
import styles from "./dock.module.scss";

export const MaskIcon = (props: { src: string; className?: string; style?: CSSProperties }) => (
  <div className={props.className} style={{ ...props.style, maskImage: `url(${props.src})` }} />
);

type BtnProps = {
  className?: string;
  tooltip?: ReactNode;
  disabled?: boolean;
  selected?: boolean;
  style?: CSSProperties;
  onSelect?: () => void;
};

export const Btn = forwardRef<HTMLDivElement, PropsWithChildren<BtnProps>>((props, ref) => {
  const button = (
    <Button
      variant="icon"
      className={props.className}
      style={props.style}
      disabled={props.disabled}
      selected={props.selected}
      focusKey={FOCUS_DISABLED}
      onSelect={props.disabled ? undefined : props.onSelect}
    >
      {props.children}
    </Button>
  );

  return (
    <div ref={ref} style={{ display: "flex" }}>
      {props.tooltip ? <Tooltip tooltip={props.tooltip}>{button}</Tooltip> : button}
    </div>
  );
});

export const Chevron = (props: { direction: "left" | "right" }) => (
  <div className={classNames(styles.chevron, props.direction === "left" ? styles.chevronLeft : styles.chevronRight)} />
);

export const Caret = () => <div className={styles.caret} />;
