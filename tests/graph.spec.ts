import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { NetworkService } from "src/app/network/network.service";
import { WeatherService } from "src/app/network/weather/weather.service";
import { LocationService } from "src/app/location/location.service";
import { PathType } from "src/app/network/graph";
import { responseForCalcShortestPaths } from "./mock-data/network";
import { networkDataForCalcShortestPaths } from "./mock-data/network-data";

describe('Graph', () => {
    let networkService: NetworkService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                NetworkService, WeatherService, LocationService
            ]
        });

        networkService = TestBed.get(NetworkService);
    });

    describe('calcShortestPaths', () => {
        it('should calc shortest paths', fakeAsync(() => {
            networkService.createGraph(responseForCalcShortestPaths).toPromise();
            tick();

            const graph = networkService.getGraph();
            expect(graph.getEdges().length).toBe(29);
            expect(graph.getNodes().length).toBe(18);
            expect(graph.getRelations().length).toBe(0);

            networkService.updateGraph(networkDataForCalcShortestPaths).toPromise();
            tick();

            networkService.correctGraph().toPromise();
            tick();

            const odPairs = [
                { origin: 'N5', destination: 'N3', pathType: PathType.distance },
                { origin: 'N4', destination: 'N3', pathType: PathType.duration },
                { origin: 'N4', destination: 'N1', pathType: PathType.distance }
            ];

            graph.calcShortestPaths(odPairs).toPromise();
            tick();

            const shortestPaths = graph.getShortestPaths();
            expect(shortestPaths.length).toBe(3);
            expect(shortestPaths[0].length).toBe(3);
            expect(shortestPaths[1].length).toBe(2);
            expect(shortestPaths[2].length).toBe(0);

            expect(shortestPaths[0][0].length).toBe(9);
            expect(shortestPaths[0][1].length).toBe(10);
            expect(shortestPaths[0][2].length).toBe(7);
            expect(shortestPaths[1][0].length).toBe(3);
            expect(shortestPaths[1][1].length).toBe(8);
        }));
    });
});
