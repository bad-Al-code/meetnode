import { type VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

interface IconButtonGroupProps {
  iconLeft: React.ElementType;
  iconRight: React.ElementType;
  labelLeft?: string;
  labelRight?: string;
  onClickLeft?: () => void;
  onClickRight?: () => void;
  variant?: ButtonVariant;
  separatorColor?: string;
  separatorWidth?: string;
  className?: string;
  buttonLeftClassName?: string;
  buttonRightClassName?: string;
  iconClassName?: string;
}

export const IconButtonGroup: React.FC<IconButtonGroupProps> = ({
  iconLeft: IconLeft,
  iconRight: IconRight,
  labelLeft,
  labelRight,
  onClickLeft,
  onClickRight,
  variant = "destructive",
  separatorColor = "divide-neutral-100",
  separatorWidth = "divide-x-1",
  className,
  buttonLeftClassName,
  buttonRightClassName,
}) => {
  const containerClasses = cn(
    "flex",
    separatorWidth,
    separatorColor,
    className
  );

  const commonButtonClasses = cn("rounded-none");

  const leftButtonClasses = cn(
    commonButtonClasses,
    "rounded-l-md",
    buttonLeftClassName
  );

  const rightButtonClasses = cn(
    commonButtonClasses,
    "rounded-r-md",
    buttonRightClassName
  );

  return (
    <div className={containerClasses}>
      <Button
        aria-label={labelLeft}
        className={leftButtonClasses}
        size="icon"
        variant={variant}
        onClick={onClickLeft}
      >
        <IconLeft />
      </Button>
      <Button
        aria-label={labelRight}
        className={rightButtonClasses}
        variant={variant}
        size="icon"
        onClick={onClickRight}
      >
        <IconRight />
      </Button>
    </div>
  );
};
