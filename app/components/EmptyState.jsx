import admin from "../styles/admin.module.css";

export function EmptyState({
  heading = "Nothing here yet",
  description = "Data will appear once customers start using wishlists.",
  actionLabel,
  onAction,
  actionHref,
}) {
  return (
    <s-section accessibilityLabel="Empty state section">
      <div className={admin.empty}>
        <s-stack alignItems="center" gap="base">
          <s-heading>{heading}</s-heading>
          <s-paragraph>{description}</s-paragraph>
          {(actionLabel && onAction) || actionHref ? (
            <s-button-group>
              {actionHref ? (
                <s-button slot="primary-action" href={actionHref}>
                  {actionLabel}
                </s-button>
              ) : (
                <s-button slot="primary-action" onClick={onAction}>
                  {actionLabel}
                </s-button>
              )}
            </s-button-group>
          ) : null}
        </s-stack>
      </div>
    </s-section>
  );
}
