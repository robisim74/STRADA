import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import * as fromUi from '../../models/reducers';
import { Step } from '../../models/wizard';
import { PathType } from '../../../network/graph';
import { EnumValues } from '../../utils';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-estimate-of-demand',
    templateUrl: './estimate-of-demand.component.html',
    styleUrls: ['./estimate-of-demand.component.scss']
})
export class EstimateOfDemandComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    pathTypes: PathType[];

    get odPairs(): FormArray {
        return this.formGroup.get('odPairs') as FormArray;
    }

    constructor(
        private formBuilder: FormBuilder,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService
    ) {
        super();

        this.pathTypes = EnumValues.getValues(PathType);
    }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    deletePair(i: number): void {
        // Updates control.
        const control = this.formGroup.get('odPairs') as FormArray;
        control.removeAt(i);
        // Updates step state.
        const odPairs: number[][] = this.wizard.state.steps[2] ? this.wizard.state.steps[2].data.odPairs : [];
        odPairs.pop();
        this.wizard.updateStep({ odPairs: odPairs }, 2);
    }

    valueChanges(): void {
        // Updates network service data on value changes.
        this.subscriptions.push(this.formGroup.valueChanges.subscribe(
            () => {
                this.network.setOdPairs(this.formGroup.get('odPairs').value);
            }
        ));
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.steps)).subscribe((steps: Step[]) => {
            if (steps[this.index]) {
                const odPairs: number[][] = steps[this.index]['data']['odPairs'];
                if (odPairs.length > 0) {
                    const control = this.formGroup.get('odPairs') as FormArray;
                    // Adds new O/D pair.
                    if (control.length < odPairs.length) {
                        control.push(this.formBuilder.group({
                            origin: odPairs[odPairs.length - 1][0],
                            destination: null,
                            pathType: null
                        }));
                    } else {
                        control.get([control.length - 1]).patchValue({
                            origin: odPairs[odPairs.length - 1][0],
                            destination: odPairs[odPairs.length - 1][1] ? odPairs[odPairs.length - 1][1] : null,
                            pathType: PathType.distance
                        });
                    }

                }
            }
        }));
    }

    sendActions(): void {
        //
    }

}
