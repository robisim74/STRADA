import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Estimates the O/D matrix of the traffic demand.
 */
@Injectable() export class DemandService {

    private odMatrix: number[][] = [];

    public reset(): void {
        this.odMatrix = [];
    }

    /**
     * Calculates O/D matrix
     */
    public calcOdMatrix(): Observable<any> {
        return of(null);
    }

    public getOdMatrix(): number[][] {
        return this.odMatrix;
    }

}
