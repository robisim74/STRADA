import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as math from 'mathjs';

import { LocationService } from '../../location/location.service';
import { WeatherConditions } from './weather';
import { appConfig } from '../../app-config';
import { uiConfig } from '../../ui/ui-config';

/**
 * Gets the weather data from the Weather or Forecast resources
 * and provides reduction factors for graph values based on weather conditions.
 */
@Injectable() export class WeatherService {

    private weatherConditions: WeatherConditions;

    constructor(private http: HttpClient, private location: LocationService) { }

    public reset(): void {
        this.weatherConditions = null;
    }

    public getWeatherConditions(): WeatherConditions {
        return this.weatherConditions;
    }

    /**
     * Gets weather data from the Weather resource. The Forecast resource is called only if the optional parameter 'time' is evaluated.
     * @param time Optional parameter for forecasting data
     */
    public getWeatherData(time?: Date): Observable<any> {
        const url: string = time ? appConfig.apis.openWeatherMap.forecastUrl : appConfig.apis.openWeatherMap.weatherUrl;
        const options = {
            params: new HttpParams()
                .set('lat', this.location.getLatLng().lat.toString())
                .set('lon', this.location.getLatLng().lng.toString())
                .set('appid', appConfig.apis.openWeatherMap.apiKey)
        };

        return this.http.get(url, options).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getWeatherData'))
        );
    }

    /**
     * Updates weather conditions with the data obtained from OpenWeatherMap.
     * @param data Weather data
     * @param time Optional parameter for forecasting data
     */
    public updateWeatherData(data: any, time?: Date): Observable<any> {
        if (time != null && data.list.length > 0) {
            const timezoneOffset: number = time.getTimezoneOffset() * 60 * 1000; // Timezone offset in milliseconds
            const utcTime: number = time.getTime() + timezoneOffset;

            let preDt: number = data.list[0].dt * 1000; // Converts Unix UTC in millisencods
            let forecast: any = data.list[0];
            for (let i = 1; i < data.list.length; i++) {
                const nextDt: number = data.list[i].dt * 1000;
                // Finds the closest value.
                if (nextDt >= utcTime) {
                    forecast = nextDt - utcTime < utcTime - preDt ? data.list[i] : data.list[i - 1];
                    break;
                }
                preDt = data.list[i].dt * 1000;
            }
            this.addWeatherConditions(forecast);
        } else {
            this.addWeatherConditions(data);
        }
        return of(null);
    }

    /**
     * Changes the current weather conditions.
     * @param weather The weather conditions
     */
    public changeWeather(weather: WeatherConditions): void {
        this.weatherConditions = {
            description: weather.description,
            icon: weather.icon,
            visibility: weather.visibility,
            rainIntensity: weather.rainIntensity,
            snowIntensity: weather.snowIntensity
        };
    }

    /**
     * Calculates Weather Adjustment Factors.
     * @returns The factor for sp parameter
     */
    public getFactors(): number[] {
        const factors: number[] = [];
        let capacityFactor = uiConfig.adjustmentFactorCoefficients[0] +
            uiConfig.adjustmentFactorCoefficients[1] * (this.weatherConditions.visibility / 1000) +
            uiConfig.adjustmentFactorCoefficients[2] * this.toInches(this.weatherConditions.rainIntensity) +
            uiConfig.adjustmentFactorCoefficients[3] * this.toInches(this.weatherConditions.snowIntensity) +
            uiConfig.adjustmentFactorCoefficients[4] *
            this.toInches(this.weatherConditions.visibility) * this.toInches(this.weatherConditions.rainIntensity) +
            uiConfig.adjustmentFactorCoefficients[5] *
            this.toInches(this.weatherConditions.visibility) * this.toInches(this.weatherConditions.snowIntensity);
        if (capacityFactor < 0.1) { capacityFactor = 0.1; }
        factors.push(math.round(capacityFactor, 2) as number);
        return factors;
    }

    private addWeatherConditions(data: any): void {
        this.weatherConditions = {
            description: data.weather[0] ? data.weather[0].description : '-',
            icon: data.weather[0] ? data.weather[0].icon : null,
            visibility: data.visibility ? data.visibility : uiConfig.visibility.default,
            rainIntensity: data.rain ? data.rain['3h'] : 0,
            snowIntensity: data.snow ? data.snow['3h'] : 0
        };
    }

    private toInches(value: number): number {
        return value / 10 / 2.54;
    }

}
