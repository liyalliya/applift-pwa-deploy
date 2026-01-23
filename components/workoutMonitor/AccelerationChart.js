import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('chart.js/auto').then(mod => mod.Chart), { ssr: false });

export default function AccelerationChart({ timeData, rawData, filteredData, thresholdHigh, thresholdLow }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    // Lazy load Chart.js
    import('chart.js/auto').then(({ Chart }) => {
      const ctx = canvasRef.current.getContext('2d');
      
      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timeData,
          datasets: [
            {
              label: 'Raw Acceleration',
              data: rawData,
              borderColor: 'rgba(255, 99, 132, 0.5)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1
            },
            {
              label: 'Filtered (Kalman)',
              data: filteredData,
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1
            },
            {
              label: 'High Threshold',
              data: Array(timeData.length).fill(thresholdHigh),
              borderColor: 'rgba(75, 192, 192, 0.5)',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false
            },
            {
              label: 'Low Threshold',
              data: Array(timeData.length).fill(thresholdLow),
              borderColor: 'rgba(255, 159, 64, 0.5)',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Time (seconds)',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.5)',
                maxRotation: 0,
                autoSkipPadding: 20
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Acceleration (m/s²)',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.5)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              min: 8,
              max: 12
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: 'rgba(255, 255, 255, 0.7)',
                font: {
                  size: 11
                },
                padding: 10,
                usePointStyle: true
              }
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: 'rgba(255, 255, 255, 0.9)',
              bodyColor: 'rgba(255, 255, 255, 0.7)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1
            }
          }
        }
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [timeData, rawData, filteredData, thresholdHigh, thresholdLow]);

  return (
    <div className="w-full h-64 md:h-80">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
