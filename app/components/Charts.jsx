import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

function useChart(configFactory, deps) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    chartRef.current?.destroy();
    Chart.getChart(canvas)?.destroy();

    const chart = new Chart(canvas, configFactory());
    chartRef.current = chart;

    return () => {
      chart.destroy();

      if (chartRef.current === chart) {
        chartRef.current = null;
      }

      Chart.getChart(canvas)?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}

/**
 * Wishlist analytics charts (Chart.js).
 */
export function Charts({ growth = [], topProducts = [], activeCustomers = [] }) {
  const growthRef = useChart(
    () => ({
      type: "line",
      data: {
        labels: growth.map((g) => g.date),
        datasets: [
          {
            label: "Wishlist items added",
            data: growth.map((g) => g.count),
            borderColor: "#1a1a1a",
            backgroundColor: "rgba(26, 26, 26, 0.08)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    }),
    [growth],
  );

  const productsRef = useChart(
    () => ({
      type: "bar",
      data: {
        labels: topProducts.map((p) =>
          p.productTitle.length > 22
            ? `${p.productTitle.slice(0, 22)}…`
            : p.productTitle,
        ),
        datasets: [
          {
            label: "Wishes",
            data: topProducts.map((p) => p.count),
            backgroundColor: "#5c6ac4",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    }),
    [topProducts],
  );

  const customersRef = useChart(
    () => ({
      type: "bar",
      data: {
        labels: activeCustomers.map(
          (c) => c.customerEmail || c.customerId?.slice(-8) || "Customer",
        ),
        datasets: [
          {
            label: "Items saved",
            data: activeCustomers.map((c) => c.count),
            backgroundColor: "#008060",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    }),
    [activeCustomers],
  );

  return (
    <s-stack gap="base">
      <s-section heading="Wishlist Growth">
        <div style={{ height: 280, position: "relative" }}>
          <canvas ref={growthRef} />
        </div>
      </s-section>

      <s-grid
        gridTemplateColumns="@container (inline-size <= 600px) 1fr, 1fr 1fr"
        gap="base"
      >
        <s-section heading="Top 10 Most Wished Products">
          <div style={{ height: 320, position: "relative" }}>
            <canvas ref={productsRef} />
          </div>
        </s-section>
        <s-section heading="Most Active Customers">
          <div style={{ height: 320, position: "relative" }}>
            <canvas ref={customersRef} />
          </div>
        </s-section>
      </s-grid>
    </s-stack>
  );
}

/**
 * Compact growth chart for the dashboard.
 */
export function GrowthChart({ growth = [] }) {
  const canvasRef = useChart(
    () => ({
      type: "line",
      data: {
        labels: growth.map((g) => g.date.slice(5)),
        datasets: [
          {
            label: "Added",
            data: growth.map((g) => g.count),
            borderColor: "#1a1a1a",
            backgroundColor: "rgba(26, 26, 26, 0.06)",
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    }),
    [growth],
  );

  return (
    <div style={{ height: 240, position: "relative" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
