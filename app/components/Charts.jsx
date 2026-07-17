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
      if (chartRef.current === chart) chartRef.current = null;
      Chart.getChart(canvas)?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#202223",
      padding: 10,
      cornerRadius: 8,
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
            borderColor: "#202223",
            backgroundColor: "rgba(32, 34, 35, 0.06)",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            borderWidth: 2,
          },
        ],
      },
      options: baseOptions,
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
            backgroundColor: "#202223",
            borderRadius: 4,
            barThickness: 14,
          },
        ],
      },
      options: {
        ...baseOptions,
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
            backgroundColor: "#008060",
            borderRadius: 4,
            barThickness: 16,
          },
        ],
      },
      options: baseOptions,
    }),
    [activeCustomers],
  );

  return (
    <div className={admin.shell}>
      <div className={admin.card}>
        <div className={admin.cardHead}>
          <div>
            <h3 className={admin.cardTitle}>Wishlist growth</h3>
            <p className={admin.cardHint}>Daily saved products over time</p>
          </div>
        </div>
        <div className={admin.cardBody}>
          <div className={admin.chartBox}>
            <canvas ref={growthRef} />
          </div>
        </div>
      </div>

      <div className={admin.grid2Equal}>
        <div className={admin.card}>
          <div className={admin.cardHead}>
            <div>
              <h3 className={admin.cardTitle}>Product demand</h3>
              <p className={admin.cardHint}>Top wished products</p>
            </div>
          </div>
          <div className={admin.cardBody}>
            <div className={admin.chartBoxTall}>
              <canvas ref={productsRef} />
            </div>
          </div>
        </div>

        <div className={admin.card}>
          <div className={admin.cardHead}>
            <div>
              <h3 className={admin.cardTitle}>Customer activity</h3>
              <p className={admin.cardHint}>Most active shoppers</p>
            </div>
          </div>
          <div className={admin.cardBody}>
            <div className={admin.chartBoxTall}>
              <canvas ref={customersRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            borderColor: "#202223",
            backgroundColor: "rgba(32, 34, 35, 0.06)",
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...baseOptions,
        scales: {
          ...baseOptions.scales,
          x: {
            ...baseOptions.scales.x,
            ticks: { ...baseOptions.scales.x.ticks, maxTicksLimit: 8 },
          },
        },
      },
    }),
    [growth],
  );

  return (
    <div className={admin.chartBox} style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
