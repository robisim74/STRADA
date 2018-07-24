import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import * as math from 'mathjs';

import { NetworkService } from '../network/network.service';

/**
 * Estimates the O/D matrix of the traffic demand.
 */
@Injectable() export class DemandService {

    /**
     * The array of the demand [pairs].
     */
    private demand: number[] = [];

    /**
     * The matrix of the demand [pairs,paths]
     */
    private odMatrix: number[][] = [];

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

        this.demand = this.gls(linkFlows, assignmentMatrix);
        // Shares the demand on each path.
        for (let z = 0; z < assignmentMatrix.length; z++) {
            this.odMatrix[z] = [];
            for (let n = 0; n < assignmentMatrix[z].length; n++) {
                const p = assignmentMatrix[z][n].find(value => value > 0) || 0;
                this.odMatrix[z][n] = math.round(p * this.demand[z]) as number;
            }
        }
        return of(null);
    }

    public getDemand(): number[] {
        return this.demand;
    }

    public getOdMatrix(): number[][] {
        return this.odMatrix;
    }

    /**
     * Generalized least squares (GLS).
     * @param linkFlows The link flows
     * @param assignmentMatrix Assignment matrix [pairs,paths,edges]
     * @returns The array of the demand
     */
    public gls(linkFlows: Array<{ value: number, density: number }>, assignmentMatrix: number[][][]): number[] {
        const demand: number[] = [];
        // Calculates argument of the minimum for each O/D pair.
        for (let z = 0; z < assignmentMatrix.length; z++) {
            demand[z] = assignmentMatrix[z].length > 0 ? this.argmin(linkFlows, assignmentMatrix[z]) : 0;
        }
        return demand;
    }

    /**
     * Argument of the minimum function.
     * @param linkFlows The link flows
     * @param odMatrixAssignment Assignment matrix of the O/D pair
     */
    private argmin(linkFlows: Array<{ value: number, density: number }>, odMatrixAssignment: number[][]): number {
        const estimations: number[] = [];

        // The unknown demand.
        let x = 0;
        estimations[x] = this.estimate(linkFlows, odMatrixAssignment, x);
        do {
            x++;
            estimations[x] = this.estimate(linkFlows, odMatrixAssignment, x);
        } while (estimations[x] <= estimations[x - 1] && x <= 10000);
        return x - 1;
    }

    /**
     * Estimates the sum for the unknown demand.
     * @param linkFlows The link flows
     * @param odMatrixAssignment Assignment matrix of the O/D pair
     * @param x The unknown demand
     */
    private estimate(linkFlows: Array<{ value: number, density: number }>, odMatrixAssignment: number[][], x: number): number {
        let sum = 0;
        for (let i = 0; i < linkFlows.length; i++) {
            if (linkFlows[i].value > 0 && this.isOnPath(odMatrixAssignment, i)) {
                const base = linkFlows[i].value - this.sum(odMatrixAssignment, i, x);
                sum += math.pow(base, 2) as number /
                    this.calcVariance(linkFlows[i].density);
            }
        }
        return math.round(sum, 2) as number;
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
        return math.round(sum, 2) as number;
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
     * Calculates the variance of measurement errors of link flows.
     * @param density The edge density
     */
    private calcVariance(density: number): number {
        return density > 0 ? math.round(1 / density, 2) as number : 1;
    }

}
