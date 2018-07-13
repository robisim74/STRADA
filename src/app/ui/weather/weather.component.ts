import { Component, OnInit, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard/wizard.service';
import { WeatherService } from '../../network/weather/weather.service';
import { NetworkService } from '../../network/network.service';
import * as fromUi from '../models/reducers';
import { Step } from '../models/wizard';

import { BaseComponent } from '../models/base.component';

@Component({
    selector: 'ui-weather',
    templateUrl: './weather.component.html',
    styleUrls: ['./weather.component.scss']
})
export class WeatherComponent extends BaseComponent implements OnInit, AfterViewInit {

    description = '-';

    iconContainer: HTMLElement;

    icon: any;

    time: any | string = '';

    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer2,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private weather: WeatherService,
        private network: NetworkService
    ) {
        super();
    }

    ngOnInit(): void {
        this.receiveActions();
        this.sendActions();
    }

    ngAfterViewInit(): void {
        this.iconContainer = this.elementRef.nativeElement.querySelector('#iconContainer');
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.steps)).subscribe((steps: Step[]) => {
            switch (this.wizard.state.currentStep) {
                case 0:
                    this.description = '-';
                    if (this.icon) {
                        this.renderer.removeChild(this.iconContainer, this.icon);
                        this.icon = null;
                        this.time = '';
                    }
                    break;
                case 3:
                    const weatherConditions = this.weather.getWeatherConditions();
                    this.description = weatherConditions.description;
                    this.icon = weatherConditions.icon;
                    this.renderer.appendChild(this.iconContainer, this.icon);
                    this.time = this.network.getTimeString();
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }

}
