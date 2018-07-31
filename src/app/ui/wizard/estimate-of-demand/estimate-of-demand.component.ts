import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import * as fromUi from '../../models/reducers';
import { Map } from '../../models/ui-state';
import { PathType, OdPair, Node } from '../../../network/graph';
import { EnumValues } from '../../utils';
import { uiConfig } from '../../ui-config';

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

    valueChanges(): void {
        // Updates network service data on value changes.
        this.subscriptions.push(this.formGroup.get('odPairs').valueChanges.subscribe(
            (odPairs: OdPair[]) => {
                this.network.setOdPairs(odPairs);
            }
        ));
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            switch (currentStep) {
                case 0:
                    // Resets control.
                    const control = this.formGroup.get('odPairs') as FormArray;
                    if (control.length > 0) {
                        for (let i = control.length - 1; i >= 0; i--) {
                            control.removeAt(i);
                        }
                    }
                    break;
            }
        }));
        this.subscriptions.push(this.store.pipe(select(fromUi.map)).subscribe((map: Map) => {
            if (map && map.data.selectedNode) {
                this.updateOdPairs(map.data.selectedNode);

            }
        }));
    }

    sendActions(): void {
        //
    }

    deleteOdPair(i: number): void {
        // Updates control.
        const control = this.formGroup.get('odPairs') as FormArray;
        control.removeAt(i);
        // Updates step state.
        this.wizard.updateStep(this.formGroup.value, this.index);
    }

    updateOdPairs(node: Node): void {
        const control = this.formGroup.get('odPairs') as FormArray;
        const odPairs = control.value;

        let error = null;

        if (odPairs.length > 0) {
            const odPair = odPairs[odPairs.length - 1];
            // Checks limit.
            if (odPairs.length == uiConfig.maxOdPairs && odPairs[uiConfig.maxOdPairs - 1].destination) {
                error = `The maximum number of O/D pairs is ${uiConfig.maxOdPairs}`;
                // Checks if valid node.
            } else if (odPair.destination == null && node.incomingEdges.length == 0) {
                error = `The node cannot be a destination`;
            } else if (odPair.destination && node.outgoingEdges.length == 0) {
                error = `The node cannot be an origin`;
                // Checks if last O/D pair is completed.
            } else if (odPair.destination) {
                // Adds origin.
                this.addOrigin(control, node.label);
                // Checks if same node.
            } else if (odPair.origin == node.label) {
                error = `The origin and destination nodes can not be the same`;
            } else {
                // Checks if the pair is valid.
                if (odPairs.filter(pair => pair.origin == odPair.origin && pair.destination == node.label).length > 0) {
                    error = `O/D pair already selected`;
                } else {
                    // Adds destination.
                    this.addDestination(control, odPair.origin, node.label);
                }
            }
        } else {
            if (node.outgoingEdges.length == 0) {
                error = `The node cannot be an origin`;
            } else {
                // Adds origin.
                this.addOrigin(control, node.label);
            }
        }

        if (error) {
            this.wizard.putInError(error);
        } else {
            // Updates step state.
            this.wizard.updateStep({ odPairs: control.value }, 2);
        }
    }

    addOrigin(control: FormArray, origin: string): void {
        control.push(this.formBuilder.group({
            origin: origin,
            destination: null,
            pathType: null
        }));
    }

    addDestination(control: FormArray, origin: string, destination: string): void {
        control.get([control.length - 1]).patchValue({
            origin: origin,
            destination: destination,
            pathType: PathType.distance
        });
    }

}
