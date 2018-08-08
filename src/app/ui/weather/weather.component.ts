import { Component, OnInit, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';

import { Store, select } from '@ngrx/store';

import { WeatherService } from '../../network/weather/weather.service';
import { NetworkService } from '../../network/network.service';
import * as fromUi from '../models/reducers';
import { Step } from '../models/ui-state';
import { WeatherConditions } from '../../network/weather/weather';
import { appConfig } from '../../app-config';

import { BaseComponent } from '../models/base.component';

@Component({
    selector: 'ui-weather',
    templateUrl: './weather.component.html',
    styleUrls: ['./weather.component.scss']
})
export class WeatherComponent extends BaseComponent implements OnInit, AfterViewInit {

    description: string = '-';

    iconContainer: HTMLElement;

    icon: any;

    time: any | string = '';

    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer2,
        private store: Store<fromUi.UiState>,
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
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            const weatherConditions = this.weather.getWeatherConditions();
            switch (currentStep) {
                case 0:
                    this.resetConditions();
                    break;
                case 3:
                    this.setConditions(weatherConditions);
                    break;
                case 4:
                    this.resetConditions();
                    this.setConditions(weatherConditions);
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }

    setConditions(weather: WeatherConditions): void {
        this.description = weather.description;
        this.icon = this.getIcon(weather.icon);
        this.renderer.appendChild(this.iconContainer, this.icon);
        this.time = this.network.getTimeString();
    }

    resetConditions(): void {
        this.description = '-';
        if (this.icon) {
            this.renderer.removeChild(this.iconContainer, this.icon);
            this.icon = null;
            this.time = '';
        }
    }

    getIcon(code: string): HTMLImageElement {
        const icon = new Image();
        if (!!code) {
            icon.src = appConfig.apis.openWeatherMap.iconUrl + '/' + code + '.png';
        }
        return icon;
    }

}
