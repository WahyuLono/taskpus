import * as React from "react";
import { cn } from "@/lib/utils";

function AttachmentGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-group"
      className={cn("grid w-full grid-cols-1 gap-3 sm:grid-cols-2", className)}
      {...props}
    />
  );
}

function Attachment({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment"
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-left shadow-card",
        className,
      )}
      {...props}
    />
  );
}

function AttachmentMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-media"
      className={cn(
        "size-14 shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-container-low [&_img]:size-full [&_img]:object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AttachmentContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-content"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  );
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="attachment-title"
      className={cn("truncate text-sm font-medium text-on-surface", className)}
      {...props}
    />
  );
}

function AttachmentDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="attachment-description"
      className={cn("truncate text-xs text-on-surface-variant", className)}
      {...props}
    />
  );
}

function AttachmentActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn("flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

function AttachmentAction({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="attachment-action"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
};
