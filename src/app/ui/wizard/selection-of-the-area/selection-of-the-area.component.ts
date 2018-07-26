import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import * as fromUi from '../../models/reducers';
import { Map } from '../../models/wizard';
import { uiConfig } from '../../ui-config';

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
        this.subscriptions.push(this.store.pipe(select(fromUi.map)).subscribe((map: Map) => {
            if (map && map.data.bounds) {
                this.formGroup.get('bounds').setValue(map.data.bounds);
            }
        }));
    }

    sendActions(): void {
        //
    }

}
