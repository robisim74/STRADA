import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { NetworkService } from '../network/network.service';
import { LinkFlow } from '../network/graph';
import { round } from '../ui/utils';
import { uiConfig } from '../ui/ui-config';

/**
 * Estimates the O/D matrix of the traffic demand.
 */
@Injectable() export class DemandService {

    /**
     * The array of the demand.
     */
    private odMatrix: number[] = [];

    constructor(private network: NetworkService) { }

    public reset(): void {
        this.odMatrix = [];
    }

    /**
     * Calculates O/D matrix.
     */
    public calcOdMatrix(): Observable<any> {
        // Gets link flows from network.
        const linkFlows = this.network.getLinkFlows();
        // Gets assignment matrix from network.
        const assignmentMatrix = this.network.getAssignmentMatrix();
        // Calculates demand.
        this.odMatrix = this.gls(linkFlows, assignmentMatrix);
        return of(null);
    }

    public getOdMatrix(): number[] {
        return this.odMatrix;
    }

    public changeDemand(demand: number[]): void {
        if (demand.length > 0) {
            this.odMatrix = demand;
        }
    }

    /**
     * Generalized Least Squares (GLS).
     * @param linkFlows The link flows
     * @param assignmentMatrix Assignment matrix [pairs,paths,edges]
     * @returns The array of the demand
     */
    public gls(linkFlows: LinkFlow[], assignmentMatrix: number[][][]): number[] {
        const demand: number[] = [];
        // Calculates argument of the minimum for each O/D pair.
        for (let z = 0; z < assignmentMatrix.length; z++) {
            demand[z] = assignmentMatrix[z].length > 0 ? this.argmin(linkFlows, assignmentMatrix[z]) : null;
        }
        return demand;
    }

    /**
     * Argument of the minimum function.
     * @param linkFlows The link flows
     * @param odMatrixAssignment Assignment matrix of the O/D pair
     */
    private argmin(linkFlows: LinkFlow[], odMatrixAssignment: number[][]): number {
        const estimations: number[] = [];
        // The unknown demand.
        let x = 0;
        estimations[x] = this.estimate(linkFlows, odMatrixAssignment, x);
        if (estimations[x] == 0) { return 0; }
        do {
            x++;
            estimations[x] = this.estimate(linkFlows, odMatrixAssignment, x);
        } while (estimations[x] <= estimations[x - 1] && x <= uiConfig.maxDemand);
        return x - 1;
    }

    /**
     * Estimates the sum for the unknown demand.
     * @param linkFlows The link flows
     * @param odMatrixAssignment Assignment matrix of the O/D pair
     * @param x The unknown demand
     */
    private estimate(linkFlows: LinkFlow[], odMatrixAssignment: number[][], x: number): number {
        let sum = 0;
        for (let i = 0; i < linkFlows.length; i++) {
            if (linkFlows[i].value > 0 && this.isOnPath(odMatrixAssignment, i)) {
                const base = linkFlows[i].value - this.sum(odMatrixAssignment, i, x);
                sum += Math.pow(base, 2) / linkFlows[i].variance;
            }
        }
        return round(sum, 2);
    }

    /**
     * Sums the unknown demand probability for each path.
     * @param odMatrixAssignment Assignment matrix of the O/D pair
     * @param i The index of the edge
     * @param x The unknown demand
     */
    private sum(odMatrixAssignment: number[][], i: number, x: number): number {
        let sum = 0;
        for (let n = 0; n < odMatrixAssignment.length; n++) {
            if (odMatrixAssignment[n][i] > 0) {
                sum += odMatrixAssignment[n][i] * x;
            }
        }
        return round(sum, 2);
    }

    /**
     * Checks that the edge belongs to one of the paths of the O/D pair.
     * @param odMatrixAssignment Assignment matrix of the O/D pair
     * @param i The index of the edge
     */
    private isOnPath(odMatrixAssignment: number[][], i: number): boolean {
        for (let n = 0; n < odMatrixAssignment.length; n++) {
            if (odMatrixAssignment[n][i] > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Shares the demand on each path.
     * @param assignmentMatrix Assignment matrix [pairs,paths,edges]
     */
    private shareDemand(assignmentMatrix: number[][][]): number[][] {
        const sharedDemand: number[][] = [];
        for (let z = 0; z < assignmentMatrix.length; z++) {
            sharedDemand[z] = [];
            if (this.odMatrix[z] != null) {
                let sum = 0;
                for (let n = 0; n < assignmentMatrix[z].length; n++) {
                    const p = assignmentMatrix[z][n].find(value => value > 0) || 0;
                    sharedDemand[z][n] = round(p * this.odMatrix[z]);
                    sum += sharedDemand[z][n];
                }
                if (this.odMatrix[z] - sum > 0) { sharedDemand[z][0] = this.odMatrix[z] - sum; }
            }
        }
        return sharedDemand;
    }

}
