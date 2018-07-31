import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { SimulationService } from '../../../simulation/simulation.service';
import * as fromUi from '../../models/reducers';
import { ClockService } from '../../../simulation/clock.service';

@Component({
    selector: 'wizard-simulation',
    templateUrl: './simulation.component.html',
    styleUrls: ['./simulation.component.scss']
})
export class SimulationComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor(
        private formBuilder: FormBuilder,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private simulation: SimulationService,
        private clock: ClockService
    ) { }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        //
    }

    sendActions(): void {
        //
    }

    start(): void {
        this.clock.start();
    }

    pause(): void {
        this.clock.pause();
    }

    stop(): void {
        this.clock.stop();
    }

    step(): void {
        this.clock.step();
    }

    slow(): void {
        this.clock.slow();
    }

    quick(): void {
        this.clock.quick();
    }

}
