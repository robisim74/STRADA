import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import { uiConfig } from '../../ui-config';

@Component({
    selector: 'wizard-selection-of-the-area',
    templateUrl: './selection-of-the-area.component.html',
    styleUrls: ['./selection-of-the-area.component.scss']
})
export class SelectionOfTheAreaComponent implements OnInit {

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
        private wizard: WizardService,
        private network: NetworkService
    ) { }

    ngOnInit(): void {
        // Updates network service data on value changes.
        this.formGroup.valueChanges.subscribe(
            () => {
                this.network.setBounds(this.formGroup.get('bounds').value);
                this.network.setTime(this.formGroup.get('time').value);
            }
        );
    }

}
