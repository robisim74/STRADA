import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import * as fromUi from '../../models/reducers';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-estimate-of-demand',
    templateUrl: './estimate-of-demand.component.html',
    styleUrls: ['./estimate-of-demand.component.scss']
})
export class EstimateOfDemandComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor(
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService
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
        //
    }

    sendActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            if (currentStep == this.index) {
                this.schedule();
            }
        }));
    }

    /**
     * Performs in sequence the following operations:
     * - Creation of the graph
     * - Association of values to the graph
     */
    schedule(): void {
        this.wizard.putOnHold();

        const stream = this.network.getNetwork().pipe(
            switchMap((response: any) => {
                return this.network.createGraph(response);
            }),
            switchMap(() => {
                return this.network.getTrafficData();
            })
        );

        this.subscriptions.push(stream.subscribe(
            () => { },
            (error: any) => {
                let message: string;
                switch (error) {
                    case 'createGraph':
                        message = 'The graph can not be created. Try with another area';
                        break;
                    default:
                        message = 'The request could not be processed. Check your Internet connection and try again';
                }
                this.wizard.putInError(message);
                this.wizard.reset();
            },
            () => {
                this.wizard.removeFromWaiting();
            }
        ));
    }

}
