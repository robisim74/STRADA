import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { ClockService, Control } from '../../../simulation/clock.service';
import * as fromSimulation from '../../../simulation/models/reducers';
import { Simulation, Counts } from '../../../simulation/models/simulation-state';
import { toSeconds, formatTimeFromSeconds, formatTimeFromMilliseconds } from '../../utils';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-simulation',
    templateUrl: './simulation.component.html',
    styleUrls: ['./simulation.component.scss']
})
export class SimulationComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    timeInterval: number;

    timePeriod: string;

    simulatedTimeInterval: number;

    simulatedTimePeriod: string;

    counts: Counts;

    endSimulation: boolean;

    control: typeof Control = Control;

    constructor(
        private formBuilder: FormBuilder,
        private store: Store<fromSimulation.SimulationState>,
        private wizard: WizardService,
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
        this.subscriptions.push(this.store.pipe(select(fromSimulation.periods)).subscribe((periods: any) => {
            if (periods) {
                if (typeof periods.timeInterval !== "undefined") {
                    this.timeInterval = periods.timeInterval;
                }
                if (typeof periods.timePeriods !== "undefined") {
                    this.timePeriod = formatTimeFromSeconds(periods.timePeriods[periods.timePeriods.length - 1]);
                }
                if (typeof periods.simulatedTimeInterval !== "undefined") {
                    this.simulatedTimeInterval = toSeconds(periods.simulatedTimeInterval);
                }
                if (typeof periods.simulatedTimePeriod !== "undefined") {
                    this.simulatedTimePeriod = formatTimeFromMilliseconds(periods.simulatedTimePeriod);
                }
            }
        }));
        this.subscriptions.push(this.store.pipe(select(fromSimulation.simulation)).subscribe((simulation: Simulation) => {
            if (simulation && simulation.counts) {
                this.counts = simulation.counts;
            }
        }));
        this.subscriptions.push(this.store.pipe(select(fromSimulation.end)).subscribe((end: boolean) => {
            this.endSimulation = end;
            this.formGroup.get('endSimulation').setValue(end);
        }));
    }

    sendActions(): void {
        //
    }

    pressControl(control: Control): void {
        this.clock.pressControl(control);
    }

}
