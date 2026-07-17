import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import admin from "../styles/admin.module.css";

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

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1a1c1d",
      padding: 10,
      cornerRadius: 8,
      titleFont: { weight: "600" },
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(0,0,0,0.04)" },
      ticks: { color: "#6d7175", font: { size: 11 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, color: "#6d7175", font: { size: 11 } },
      grid: { color: "rgba(0,0,0,0.05)" },
      border: { display: false },
    },
  },
};

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
            borderColor: "#e11d48",
            backgroundColor: "rgba(225, 29, 72, 0.1)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
        ],
      },
      options: chartDefaults,
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
            backgroundColor: "#4f46e5",
            borderRadius: 6,
            barThickness: 16,
          },
        ],
      },
      options: {
        ...chartDefaults,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, color: "#6d7175", font: { size: 11 } },
            grid: { color: "rgba(0,0,0,0.05)" },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { color: "#6d7175", font: { size: 11 } },
            border: { display: false },
          },
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
            backgroundColor: "#0f766e",
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      },
      options: chartDefaults,
    }),
    [activeCustomers],
  );

  return (
    <s-stack gap="base">
      <div className={admin.panel}>
        <div className={admin.panelHeader}>
          <div>
            <h3 className={admin.panelTitle}>Wishlist growth</h3>
            <p className={admin.panelHint}>Daily saved products over time</p>
          </div>
        </div>
        <div className={admin.panelBody}>
          <div className={admin.chartWrap}>
            <canvas ref={growthRef} />
          </div>
        </div>
      </div>

      <div className={admin.splitEqual}>
        <div className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h3 className={admin.panelTitle}>Top wished products</h3>
              <p className={admin.panelHint}>Most saved items</p>
            </div>
          </div>
          <div className={admin.panelBody}>
            <div className={admin.chartWrapTall}>
              <canvas ref={productsRef} />
            </div>
          </div>
        </div>

        <div className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h3 className={admin.panelTitle}>Most active customers</h3>
              <p className={admin.panelHint}>Shoppers saving the most</p>
            </div>
          </div>
          <div className={admin.panelBody}>
            <div className={admin.chartWrapTall}>
              <canvas ref={customersRef} />
            </div>
          </div>
        </div>
      </div>
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
            borderColor: "#e11d48",
            backgroundColor: "rgba(225, 29, 72, 0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          ...chartDefaults.scales,
          x: {
            ...chartDefaults.scales.x,
            ticks: { ...chartDefaults.scales.x.ticks, maxTicksLimit: 8 },
          },
        },
      },
    }),
    [growth],
  );

  return (
    <div className={admin.chartWrap} style={{ height: 240 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
