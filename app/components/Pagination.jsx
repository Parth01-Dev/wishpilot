import admin from "../styles/admin.module.css";

export function Pagination({ page, totalPages, onPrev, onNext, baseUrl }) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const controls = baseUrl ? (
    <>
      <s-button
        variant="secondary"
        disabled={!canPrev || undefined}
        href={
          canPrev
            ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page - 1}`
            : undefined
        }
      >
        Previous
      </s-button>
      <s-button
        variant="secondary"
        disabled={!canNext || undefined}
        href={
          canNext
            ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page + 1}`
            : undefined
        }
      >
        Next
      </s-button>
    </>
  ) : (
    <>
      <s-button
        variant="secondary"
        disabled={!canPrev || undefined}
        onClick={onPrev}
      >
        Previous
      </s-button>
      <s-button
        variant="secondary"
        disabled={!canNext || undefined}
        onClick={onNext}
      >
        Next
      </s-button>
    </>
  );

  return (
    <div className={admin.pager}>
      <s-text>
        Page {page} of {totalPages}
      </s-text>
      <s-stack direction="inline" gap="small">
        {controls}
      </s-stack>
    </div>
  );
}
