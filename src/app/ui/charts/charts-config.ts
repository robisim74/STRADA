import 'chartjs-plugin-annotation';

import { uiConfig } from "../ui-config";

export const trafficChartOptions = {
    legend: {
        display: false
    },
    title: {
        display: true
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        xAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'Time (s)'
            },
            ticks: {
                beginAtZero: true
            }
        }],
        yAxes: [{
            display: true,
            maxBarThickness: 40
        }]
    }
};

export const busiestChartOptions = {
    legend: {
        display: true
    },
    title: {
        display: true
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        xAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'Time'
            },
            ticks: {
                beginAtZero: true
            }
        }],
        yAxes: [{
            id: 'y-axis-0',
            type: 'linear',
            ticks: {
                stepSize: 10
            }
        }]
    },
    annotation: {
        drawTime: 'afterDatasetsDraw',
        annotations: []
    }
};

export const busiestColor = '#63a4ff';
