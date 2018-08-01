import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { ClockService, Control } from '../../../simulation/clock.service';
import * as fromSimulation from '../../../simulation/models/reducers';

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

    endSimulation: boolean;

    control = Control;

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
                if (typeof periods.timePeriod !== "undefined") {
                    this.timePeriod = this.formatTimeFromSeconds(periods.timePeriod[periods.timePeriod.length - 1]);
                }
                if (typeof periods.simulatedTimeInterval !== "undefined") {
                    this.simulatedTimeInterval = this.toSeconds(periods.simulatedTimeInterval);
                }
                if (typeof periods.simulatedTimePeriod !== "undefined") {
                    this.simulatedTimePeriod = this.formatTimeFromMilliseconds(periods.simulatedTimePeriod);
                }
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

    toSeconds(value: number): number {
        return value / 1000;
    }

    /**
     * Format time to M:SS
     * @param s Seconds
     * @returns M:SS
     */
    formatTimeFromSeconds(s: number): string {
        return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
    }

    /**
     * Format time to M:SS.mmm
     * @param ms Milliseconds
     * @returns M:SS.mmm
     */
    formatTimeFromMilliseconds(ms: number): string {
        return Math.floor(ms / 1000 / 60) + ':' +
            ('0' + Math.floor((ms / 1000) % 60)).slice(-2) + '.' +
            (ms - Math.floor(ms / 1000) * 1000);
    }

}
