import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { WeatherService } from "src/app/network/weather/weather.service";
import { LocationService } from "src/app/location/location.service";

describe('WeatherService', () => {
    let weatherService: WeatherService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                WeatherService, LocationService
            ]
        });

        weatherService = TestBed.get(WeatherService);
    });

    describe('getFactors', () => {
        it('should consider the clear sky', () => {
            const factors = weatherService.getFactors({
                description: null,
                icon: null,
                visibility: 10000,
                rainIntensity: 0,
                snowIntensity: 0
            });
            const factor = factors[0];
            expect(factor).toBe(1);
        });
        it('should consider rain intensity', () => {
            const factors = weatherService.getFactors({
                description: null,
                icon: null,
                visibility: 1000,
                rainIntensity: 5,
                snowIntensity: 0
            });
            const factor = factors[0];
            expect(factor).toBe(0.84);
        });
        it('should consider snow intensity', () => {
            const factors = weatherService.getFactors({
                description: null,
                icon: null,
                visibility: 1000,
                rainIntensity: 0,
                snowIntensity: 10
            });
            const factor = factors[0];
            expect(factor).toBe(0.35);
        });
        it('should return min value', () => {
            const factors = weatherService.getFactors({
                description: null,
                icon: null,
                visibility: 1000,
                rainIntensity: 70,
                snowIntensity: 0
            });
            const factor = factors[0];
            expect(factor).toBe(0.1);
        });
    });
});
