import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Link, MoreHorizontalIcon } from "lucide-react";
import Image from "next/image";
import { ComponentProps } from "react";

interface DataCellTextProps {
  text: string;
  className?: string;
}

function DataCellText({ text, className }: DataCellTextProps) {
  return <span className={cn("text-sm", className)}>{text}</span>;
}

interface DataCellStackedProps {
  primary: string;
  secondary: string;
  className?: string;
  classNames?: {
    primary?: string;
    secondary?: string;
  };
}

function DataCellStacked({
  primary,
  secondary,
  className,
  classNames,
}: DataCellStackedProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("font-medium text-sm truncate", classNames?.primary)}>
        {primary}
      </span>
      <span
        className={cn("text-xs text-muted-foreground truncate", classNames?.secondary)}
      >
        {secondary}
      </span>
    </div>
  );
}

interface DataCellAvatarProps extends Omit<
  DataCellStackedProps,
  "className" | "classNames"
> {
  avatar?: string;
  avatarAlt?: string;
  className?: string;
  classNames?: {
    avatar?: string;
    avatarImage?: string;
    avatarFallback?: string;
    stack?: {
      root?: string;
      primary?: string;
      secondary?: string;
    };
  };
}

function DataCellAvatar({
  primary,
  secondary,
  avatar,
  avatarAlt,
  className,
  classNames,
}: DataCellAvatarProps) {
  return (
    <div className={cn("flex items-center gap-3 overflow-hidden", className)}>
      <Avatar className={cn("h-9 w-9", classNames?.avatar)}>
        <AvatarImage
          src={avatar}
          alt={avatarAlt ?? primary}
          className={classNames?.avatarImage}
        />
        <AvatarFallback className={classNames?.avatarFallback}>
          {primary
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <DataCellStacked
        primary={primary}
        secondary={secondary}
        className={classNames?.stack?.root}
        classNames={classNames?.stack}
      />
    </div>
  );
}

type MenuItemVariant = "default" | "destructive";

interface MenuItemBase {
  label: string;
  icon?: React.ReactNode;
  variant?: MenuItemVariant;
  disabled?: boolean;
}

type MenuItem =
  | (MenuItemBase & {
      onClick: () => void;
      link?: never;
    })
  | (MenuItemBase & {
      link: string;
      onClick?: never;
    });

interface DataCellMenuActionProps {
  /**
   * Array of menu items to render. If provided, children will be ignored.
   * For complex menus with separators or labels, use children instead.
   */
  items?: MenuItem[];
  /**
   * Custom menu items as children. Only used if items prop is not provided.
   * Use this for full control including separators, labels, icons, etc.
   */
  children?: React.ReactNode;
  ariaLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
  classNames?: {
    trigger?: string;
    content?: string;
    items?: string;
  };
}

function DataCellMenuAction({
  items,
  children,
  ariaLabel = "Open menu",
  align = "end",
  className,
  classNames,
}: DataCellMenuActionProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 p-0 rounded-full",
            className,
            classNames?.trigger,
          )}
        >
          <span className="sr-only">{ariaLabel}</span>
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={classNames?.content}>
        {items
          ? items.map((item, index) => {
              const isLink = !!item.link;

              const content = (
                <>
                  {item.icon}
                  {item.label}
                </>
              );

              return (
                <DropdownMenuItem
                  key={index}
                  disabled={item.disabled}
                  variant={item.variant}
                  className={cn(classNames?.items, "cursor-pointer")}
                  onClick={!isLink ? item.onClick : undefined}
                 >
                   {isLink ? <Link href={item.link!}>{content}</Link> : content}
                </DropdownMenuItem>
              );
            })
          : children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface DataCellImage extends Omit<
  ComponentProps<typeof Image>,
  "className" | "width" | "height"
> {
  className?: string;
  width?: number;
  height?: number;
}

function DataCellImage({
  className,
  width = 60,
  height = 60,
  ...props
}: DataCellImage) {
  return (
    <Image
      className={cn(
        "object-cover rounded-md aspect-square flex-none",
        className,
      )}
      width={width}
      height={height}
      {...props}
    />
  );
}

export const DataCell = {
  Text: DataCellText,
  Stacked: DataCellStacked,
  Avatar: DataCellAvatar,
  MenuAction: DataCellMenuAction,
  Image: DataCellImage,
};

export type {
  DataCellTextProps,
  DataCellStackedProps,
  DataCellAvatarProps,
  DataCellMenuActionProps,
  MenuItem,
};
