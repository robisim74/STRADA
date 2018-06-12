import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'wizard-statistics',
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() { }

    ngOnInit(): void {
        //
    }

}
