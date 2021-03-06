import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { LocationService } from '../../location/location.service';
import { WeatherConditions } from './weather';
import { round } from '../../utils';
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
                .set('units', 'metric')
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
            const timezoneOffset = time.getTimezoneOffset() * 60 * 1000; // Timezone offset in milliseconds
            const utcTime = time.getTime() + timezoneOffset;

            let preDt: number = data.list[0].dt * 1000; // Converts Unix UTC in milliseconds
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
     * @returns The factor for max flow parameter
     */
    public getFactors(): number[] {
        const factors: number[] = [];
        // Max flow.
        factors[0] = this.calcFactor(uiConfig.adjustmentFactorCoefficients.maxFlow);

        return factors;
    }

    private addWeatherConditions(data: any): void {
        this.weatherConditions = {
            description: data.weather[0] ? data.weather[0].description : '-',
            icon: data.weather[0] ? data.weather[0].icon : null,
            visibility: data.visibility && data.visibility <= uiConfig.visibility.max ? data.visibility : uiConfig.visibility.default,
            rainIntensity: data.rain && data.rain['3h'] ? round(data.rain['3h']) : 0,
            snowIntensity: data.snow && data.snow['3h'] ? round(data.snow['3h']) : 0
        };
    }

    private calcFactor(adjustmentFactorCoefficients: number[]): number {
        const factor = adjustmentFactorCoefficients[0] +
            adjustmentFactorCoefficients[1] * (this.weatherConditions.visibility / 1000) +
            adjustmentFactorCoefficients[2] * this.toInches(this.weatherConditions.rainIntensity) +
            adjustmentFactorCoefficients[3] * this.toInches(this.weatherConditions.snowIntensity) +
            adjustmentFactorCoefficients[4] *
            this.toInches(this.weatherConditions.visibility) * this.toInches(this.weatherConditions.rainIntensity) +
            adjustmentFactorCoefficients[5] *
            this.toInches(this.weatherConditions.visibility) * this.toInches(this.weatherConditions.snowIntensity);

        if (factor <= 0.1) {
            return 0.1;
        } else if (factor >= 1) {
            return 1;
        } else {
            return round(factor, 2);
        }
    }

    private toInches(value: number): number {
        return value / 10 / 2.54;
    }

}
