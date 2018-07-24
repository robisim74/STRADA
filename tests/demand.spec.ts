import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { DemandService } from "src/app/demand/demand.service";
import { NetworkService } from "src/app/network/network.service";
import { WeatherService } from "src/app/network/weather/weather.service";
import { LocationService } from "src/app/location/location.service";
import { linkFlows, assignmentMatrix } from "./mock-data/demand";

describe('DemandService', () => {
    let demandService: DemandService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                DemandService, NetworkService, WeatherService, LocationService
            ]
        });

        demandService = TestBed.get(DemandService);
    });

    describe('calcOdMatrix', () => {
        it('should calc the O/D matrix', fakeAsync(() => {
            const demand = demandService.gls(linkFlows, assignmentMatrix);
            expect(demand.length).toBe(4);
            expect(demand[0]).toBe(1);
            expect(demand[1]).toBe(1);
            expect(demand[2]).toBe(0);
            expect(demand[3]).toBe(33);
        }));
    });
});
