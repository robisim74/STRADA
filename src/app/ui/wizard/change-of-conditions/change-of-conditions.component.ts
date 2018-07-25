import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, AbstractControl, Validators } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import { DemandService } from '../../../demand/demand.service';
import * as fromUi from '../../models/reducers';
import { Step } from '../../models/wizard';
import { OdPairShowing } from '../../../network/graph';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-change-of-conditions',
    templateUrl: './change-of-conditions.component.html',
    styleUrls: ['./change-of-conditions.component.scss']
})
export class ChangeOfConditionsComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    get odPairs(): FormArray {
        return this.formGroup.get('odPairs') as FormArray;
    }

    constructor(
        private formBuilder: FormBuilder,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService,
        private demand: DemandService
    ) {
        super();
    }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        // Updates demand service data on value changes.
        this.subscriptions.push(this.formGroup.get('odPairs').valueChanges.subscribe(
            (odPairs: OdPairShowing[]) => {
                const demand = odPairs.map((pair: OdPairShowing) => {
                    return pair.demand;
                });
                this.demand.changeDemand(demand);
            }
        ));
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            const control = this.formGroup.get('odPairs') as FormArray;
            switch (currentStep) {
                // Resets control.
                case 0:
                    if (control.length > 0) {
                        for (let i = control.length - 1; i >= 0; i--) {
                            control.removeAt(i);
                        }
                    }
                    break;
                case this.index:
                    const odPairs = this.network.getOdPairs();
                    const demand = this.demand.getDemand();
                    for (let i = 0; i < odPairs.length; i++) {
                        control.push(this.buildOdPair(odPairs[i], demand[i]));
                    }
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }

    toggleValue(pair: AbstractControl): void {
        const value: boolean = pair.value.showPaths;
        pair.get('showPaths').setValue(!value);
        // Updates step state.
        this.wizard.updateStep(this.formGroup.value, this.index);
    }

    getVisibility(pair: AbstractControl): string {
        return pair.value.showPaths ? 'visibility' : 'visibility_off';
    }

    buildOdPair(odPair, demand): FormGroup {
        return this.formBuilder.group({
            origin: odPair.origin,
            destination: odPair.destination,
            pathType: odPair.pathType,
            demand: [
                { value: demand, disabled: demand == null },
                [Validators.required, Validators.min(0), Validators.max(10000), Validators.pattern('^[0-9]*$')]
            ],
            showPaths: false
        });
    }

}
