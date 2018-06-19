import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import { uiConfig } from '../../ui-config';
import * as fromUi from '../../models/reducers';
import { Step } from '../../models/wizard';

@Component({
    selector: 'wizard-selection-of-the-area',
    templateUrl: './selection-of-the-area.component.html',
    styleUrls: ['./selection-of-the-area.component.scss']
})
export class SelectionOfTheAreaComponent implements OnInit, OnDestroy {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    /**
     * Min moment: current time.
     */
    get min(): Date {
        return new Date();
    }

    /**
     * Max moment: current day.
     */
    get max(): Date {
        return new Date(
            this.min.getFullYear(),
            this.min.getMonth(),
            this.min.getDate(),
            this.min.getHours() + uiConfig.timeLimit,
            this.min.getMinutes()
        );
    }

    subscriptions: Subscription[] = [];

    constructor(
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService
    ) { }

    ngOnInit(): void {
        this.subscriptions.push(this.formGroup.valueChanges.subscribe(
            () => {
                // Updates network service.
                this.network.setBounds(this.formGroup.get('bounds').value);
                this.network.setTime(this.formGroup.get('time').value);
            }
        ));

        // Updates bounds.
        this.store.pipe(select(fromUi.steps)).subscribe((steps: Step[]) => {
            if (steps[this.index]) {
                this.formGroup.get('bounds').setValue(steps[this.index]['data']['bounds']);
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

}
