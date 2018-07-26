import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

    currentYear: number = new Date().getFullYear();

    constructor() { }

    ngOnInit(): void {
        //
    }

}
