import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'wizard-change-of-conditions',
    templateUrl: './change-of-conditions.component.html',
    styleUrls: ['./change-of-conditions.component.scss']
})
export class ChangeOfConditionsComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() { }

    ngOnInit(): void {
        //
    }

}
