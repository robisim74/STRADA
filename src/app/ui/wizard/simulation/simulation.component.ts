import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import * as fromUi from '../../models/reducers';

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
        private wizard: WizardService
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

}
