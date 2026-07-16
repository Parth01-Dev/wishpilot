/**
 * Simple previous/next pagination controls.
 */
export function Pagination({ page, totalPages, onPrev, onNext, baseUrl }) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (baseUrl) {
    const prevHref = canPrev ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page - 1}` : undefined;
    const nextHref = canNext ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page + 1}` : undefined;

    return (
      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
        <s-text>
          Page {page} of {totalPages}
        </s-text>
        <s-stack direction="inline" gap="small">
          <s-button
            variant="secondary"
            disabled={!canPrev || undefined}
            href={prevHref}
          >
            Previous
          </s-button>
          <s-button
            variant="secondary"
            disabled={!canNext || undefined}
            href={nextHref}
          >
            Next
          </s-button>
        </s-stack>
      </s-stack>
    );
  }

  return (
    <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
      <s-text>
        Page {page} of {totalPages}
      </s-text>
      <s-stack direction="inline" gap="small">
        <s-button variant="secondary" disabled={!canPrev || undefined} onClick={onPrev}>
          Previous
        </s-button>
        <s-button variant="secondary" disabled={!canNext || undefined} onClick={onNext}>
          Next
        </s-button>
      </s-stack>
    </s-stack>
  );
}
