import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import { uiConfig } from '../../ui-config';
import * as fromUi from '../../models/reducers';
import { Step } from '../../models/wizard';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-selection-of-the-area',
    templateUrl: './selection-of-the-area.component.html',
    styleUrls: ['./selection-of-the-area.component.scss']
})
export class SelectionOfTheAreaComponent extends BaseComponent implements OnInit {

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
        // Updates network service data on value changes.
        this.subscriptions.push(this.formGroup.get('bounds').valueChanges.subscribe(
            (bounds: google.maps.LatLngBoundsLiteral) => {
                this.network.setBounds(bounds);
            }
        ));
        this.subscriptions.push(this.formGroup.get('time').valueChanges.subscribe(
            (time: Date) => {
                this.network.setTime(time);
            }
        ));
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.steps)).subscribe((steps: Step[]) => {
            if (steps[this.index]) {
                this.formGroup.get('bounds').setValue(steps[this.index]['data']['bounds']);
            }
        }));
    }

    sendActions(): void {
        //
    }

}
