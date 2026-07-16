/**
 * Reusable empty state using Polaris web components.
 */
export function EmptyState({
  heading = "Nothing here yet",
  description = "Data will appear once customers start using wishlists.",
  actionLabel,
  onAction,
  actionHref,
}) {
  return (
    <s-section accessibilityLabel="Empty state section">
      <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
        <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
          <s-stack alignItems="center" gap="small">
            <s-heading>{heading}</s-heading>
            <s-paragraph>{description}</s-paragraph>
          </s-stack>
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
        </s-grid>
      </s-grid>
    </s-section>
  );
}
