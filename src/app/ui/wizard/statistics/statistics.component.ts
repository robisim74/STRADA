import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { SimulationService } from '../../../simulation/simulation.service';
import { ClockService } from '../../../simulation/clock.service';
import * as fromUi from '../../models/reducers';
import { formatTimeFromSeconds, formatTimeFromMilliseconds } from '../../utils';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-statistics',
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    totalTime: string;

    totalSimulatedTime: string;

    totalProcessingTime: string;

    totalAvgSpeed: number;

    constructor(
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private simulation: SimulationService,
        private clock: ClockService
    ) {
        super();
    }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            switch (currentStep) {
                case this.index:
                    const simulationStatistics = this.simulation.getStatistics();
                    const clockStatistics = this.clock.getStatistics();
                    this.totalTime = formatTimeFromSeconds(simulationStatistics.totalTime);
                    this.totalSimulatedTime = formatTimeFromMilliseconds(clockStatistics.totalSimulatedTime);
                    this.totalProcessingTime = formatTimeFromMilliseconds(clockStatistics.totalProcessingTime);
                    this.totalAvgSpeed = simulationStatistics.totalAvgSpeed;
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }
}
