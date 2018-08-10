import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';

import { Store, select } from '@ngrx/store';
import { Chart } from 'chart.js';

import { SimulationService } from '../../simulation/simulation.service';
import * as fromUi from '../models/reducers';
import { formatTimeFromSeconds } from '../utils';
import { trafficChartOptions, busiestChartOptions, busiestColor } from './charts-config';
import { uiConfig } from '../ui-config';

import { BaseComponent } from '../models/base.component';

@Component({
    selector: 'ui-charts',
    templateUrl: './charts.component.html',
    styleUrls: ['./charts.component.scss']
})
export class ChartsComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {

    heavyTrafficCtx: HTMLCanvasElement;

    moderateTrafficCtx: HTMLCanvasElement;

    busiestCtx: HTMLCanvasElement;

    heavyTrafficChart: Chart;

    moderateTrafficChart: Chart;

    busiestChart: Chart;

    statistics: any;

    constructor(
        private elementRef: ElementRef,
        private store: Store<fromUi.UiState>,
        private simulation: SimulationService
    ) {
        super();
    }

    ngOnInit(): void {
        //
    }

    ngAfterViewInit(): void {
        this.createCharts();
        this.receiveActions();
        this.sendActions();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
        if (this.heavyTrafficChart) { this.heavyTrafficChart.destroy(); }
        if (this.moderateTrafficChart) { this.moderateTrafficChart.destroy(); }
        if (this.busiestChart) { this.busiestChart.destroy(); }
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            switch (currentStep) {
                case 5:
                    this.statistics = this.simulation.getStatistics();
                    this.populateCharts();
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }

    createCharts(): void {
        this.heavyTrafficCtx = this.elementRef.nativeElement.querySelector('#heavyTrafficChart');
        this.moderateTrafficCtx = this.elementRef.nativeElement.querySelector('#moderateTrafficChart');
        this.busiestCtx = this.elementRef.nativeElement.querySelector('#busiestChart');

        this.heavyTrafficChart = new Chart(this.heavyTrafficCtx, {
            type: 'horizontalBar',
            data: {
                labels: [],
                datasets: [
                    {
                        data: [],
                        hoverBackgroundColor: uiConfig.links.heavyTrafficColor
                    }
                ]
            },
            options: trafficChartOptions
        });
        this.moderateTrafficChart = new Chart(this.moderateTrafficCtx, {
            type: 'horizontalBar',
            data: {
                labels: [],
                datasets: [
                    {
                        data: [],
                        hoverBackgroundColor: uiConfig.links.moderateTrafficColor
                    }
                ]
            },
            options: trafficChartOptions
        });
        this.busiestChart = new Chart(this.busiestCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Traffic volume',
                        steppedLine: true,
                        data: [],
                        borderColor: busiestColor,
                        fill: false
                    }
                ]
            },
            options: busiestChartOptions
        });
    }

    populateCharts(): void {
        this.updateOptions();
        this.updateData();
        this.updateCharts();
    }

    updateOptions(): void {
        this.heavyTrafficChart.options.title.text = 'Heavy traffic';
        this.heavyTrafficChart.data.labels = this.statistics.heavyTrafficLabels;
        this.moderateTrafficChart.options.title.text = 'Moderate traffic';
        this.moderateTrafficChart.data.labels = this.statistics.moderateTrafficLabels;
        this.busiestChart.options.title.text = 'Busiest edge ' + this.statistics.busiestEdgeLabel;
        this.busiestChart.options.annotation.annotations.push({
            type: 'line',
            mode: 'horizontal',
            scaleID: "y-axis-0",
            value: this.statistics.busiestEdgeCapacity,
            borderColor: '#666',
            borderWidth: 2,
            label: {
                backgroundColor: 'rgba(255,255,255,1.0)',
                fontStyle: "normal",
                fontColor: "#666",
                position: "right",
                yAdjust: 0,
                content: "Capacity",
                enabled: true
            }
        });
        this.busiestChart.options.annotation.annotations.push({
            type: 'line',
            mode: 'vertical',
            scaleID: "x-axis-0",
            value: formatTimeFromSeconds(this.statistics.busiestEdgeDelay),
            borderColor: '#666',
            borderWidth: 2,
            label: {
                backgroundColor: 'rgba(255,255,255,1.0)',
                fontStyle: "normal",
                fontColor: "#666",
                position: "center",
                xAdjust: 0,
                content: "Delay",
                enabled: true
            }
        });
        this.busiestChart.data.labels = this.statistics.periods.map((value: number) => formatTimeFromSeconds(value));
    }

    updateData(): void {
        this.heavyTrafficChart.data.datasets[0].data = this.statistics.heavyTrafficData;
        this.moderateTrafficChart.data.datasets[0].data = this.statistics.moderateTrafficData;
        this.busiestChart.data.datasets[0].data = this.statistics.busiestEdgeData;
    }

    updateCharts(): void {
        this.heavyTrafficChart.update();
        this.moderateTrafficChart.update();
        this.busiestChart.update();
    }

}
