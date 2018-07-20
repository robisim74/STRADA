import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { NetworkService } from "src/app/network/network.service";
import { PathType } from "src/app/network/graph";
import { responseForCalcShortestPaths } from "./mock-data/network";
import { networkDataForCalcShortestPaths } from "./mock-data/network-data";

describe('Graph', () => {
    let networkService: NetworkService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                NetworkService
            ]
        });

        networkService = TestBed.get(NetworkService);
    });

    describe('calcShortestPaths', () => {
        it('should calc shortest paths', fakeAsync(() => {
            networkService.createGraph(responseForCalcShortestPaths).toPromise();
            tick();

            const graph = networkService.getGraph();
            expect(graph.getEdges().length).toBe(31);
            expect(graph.getNodes().length).toBe(19);
            expect(graph.getRelations().length).toBe(0);

            networkService.updateGraph(networkDataForCalcShortestPaths).toPromise();
            tick();

            networkService.cleanGraph().toPromise();
            tick();

            const odPairs = [
                { origin: 5, destination: 3, pathType: PathType.distance },
                { origin: 4, destination: 3, pathType: PathType.duration },
                { origin: 4, destination: 1, pathType: PathType.distance }
            ];

            graph.calcShortestPaths(odPairs).toPromise();
            tick();

            const shortestPaths = graph.getShortestPaths();
            expect(shortestPaths.length).toBe(9);
            expect(shortestPaths[0].length).toBe(9);
            expect(shortestPaths[1].length).toBe(10);
            expect(shortestPaths[2].length).toBe(8);
            expect(shortestPaths[3].length).toBe(4);
            expect(shortestPaths[4].length).toBe(8);
            expect(shortestPaths[5].length).toBe(0);
            expect(shortestPaths[6].length).toBe(0);
            expect(shortestPaths[7].length).toBe(0);
            expect(shortestPaths[8].length).toBe(0);
        }));
    });
});
